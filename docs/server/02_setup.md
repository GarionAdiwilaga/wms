# 02. Panduan Pemasangan Baru (Server Setup)

Dokumen ini menjelaskan langkah-langkah instalasi aplikasi WMS Gudang Piala Kaltim pada server Ubuntu baru, baik menggunakan skrip otomatisasi maupun secara manual, serta mengonfigurasi Cloudflare Tunnel ke domain **`wms.rionlab.space`**.

---

## Prasyarat Server
* VPS Ubuntu Server 24.04 LTS terpasang di jaringan privat/publik.
* Akses SSH ke server sebagai user `root` atau user dengan hak akses `sudo`.
* Akun Cloudflare dengan domain `wms.rionlab.space` yang terdaftar.

---

## Metode 1: Instalasi Otomatis (Sangat Direkomendasikan)

Kami menyediakan skrip otomatis `./setup_vps.sh` di root project yang akan mengonfigurasi seluruh dependensi server secara mandiri.

### Langkah-Langkah:
1. Hubungkan koneksi SSH ke VPS Anda.
2. Lakukan klon repositori Git ke folder `/opt/wms`:
   ```bash
   git clone https://github.com/GarionAdiwilaga/wms.git /opt/wms
   cd /opt/wms
   ```
3. Ubah izin eksekusi skrip, lalu jalankan:
   ```bash
   chmod +x setup_vps.sh
   sudo ./setup_vps.sh
   ```
4. **Apa yang dilakukan oleh skrip ini?**
   * Memasang Docker Engine dan Docker Compose pada server host.
   * Membuat berkas `.env` produksi secara acak dan aman (termasuk generate random password PostgreSQL dan secret key JWT).
   * Meminta Anda untuk menginput kata sandi awal untuk akun administrator pertama (`INITIAL_ADMIN_PASSWORD`).
   * Memulai stack kontainer produksi (`docker-compose.prod.yml`).
   * Menjalankan migrasi database via Alembic secara otomatis.
   * Membuat pengguna awal `super_admin` dengan username `admin` dan kata sandi yang Anda tentukan tadi.

---

## Metode 2: Instalasi Manual (Alternatif)

Jika Anda ingin menyiapkan lingkungan server langkah-demi-langkah secara manual:

### 2.1 Kloning Kode & Konfigurasi `.env`
```bash
git clone https://github.com/GarionAdiwilaga/wms.git /opt/wms
cd /opt/wms
cp .env.example .env
```
Edit file `.env` dan sesuaikan nilainya:
```env
# Database
POSTGRES_USER=postgres
POSTGRES_PASSWORD=buat_password_db_yang_sangat_kuat
POSTGRES_DB=gudang_piala_kaltim

# Backend Settings
SECRET_KEY=buat_key_jwt_acak_panjang_minimal_32_karakter
INITIAL_ADMIN_PASSWORD=kata_sandi_akun_admin_pertama
ENVIRONMENT=production
```

### 2.2 Jalankan Docker Compose
Mulai build image kontainer produksi dan hidupkan layanannya:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
Pastikan seluruh kontainer berjalan normal:
```bash
docker compose -f docker-compose.prod.yml ps
```

### 2.3 Jalankan Migrasi Database & Buat User Admin Awal
Jalankan perintah Alembic di dalam container backend untuk membuat tabel-tabel database:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```
Jalankan skrip inisialisasi user admin awal:
```bash
docker compose -f docker-compose.prod.yml exec backend python scripts/create_initial_admin.py
```
*(Catatan: Skrip ini akan membaca `INITIAL_ADMIN_PASSWORD` dari file `.env` Anda).*

---

## 3. Konfigurasi Cloudflare Zero Trust Tunnel

Setelah aplikasi berjalan di server lokal (terikat pada `localhost:80` melalui container `frontend`), Anda harus menghubungkannya ke internet menggunakan Cloudflare Tunnel.

### 3.1 Install cloudflared di VPS
Ikuti petunjuk resmi Cloudflare untuk mengunduh paket instalasi. Di Ubuntu, biasanya:
```bash
curl -L --output cloudflared.deb https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb
```

### 3.2 Login ke Cloudflare
Jalankan perintah berikut untuk mengautentikasi client:
```bash
cloudflared tunnel login
```
*Klik link yang muncul di terminal, masuk ke dashboard Cloudflare Anda, lalu pilih domain `rionlab.space` untuk memberikan izin terowongan.*

### 3.3 Buat Tunnel Baru
```bash
cloudflared tunnel create wms-tunnel
```
*Perintah ini akan menghasilkan file kredensial JSON di folder `~/.cloudflared/`.*

### 3.4 Konfigurasi Routing Domain ke Tunnel
Hubungkan domain Anda ke ID tunnel yang baru dibuat:
```bash
cloudflared tunnel route dns wms-tunnel wms.rionlab.space
```

### 3.5 Buat Berkas Konfigurasi lokal
Buat file baru di `/etc/cloudflared/config.yml` atau di `~/.cloudflared/config.yml` dengan isi:
```yaml
tunnel: <ISI_DENGAN_ID_TUNNEL_ANDA>
credentials-file: /root/.cloudflared/<ISI_DENGAN_ID_TUNNEL_ANDA>.json

ingress:
  - hostname: wms.rionlab.space
    service: http://localhost:80
  - service: http_status:404
```

### 3.6 Pasang dan Jalankan cloudflared sebagai Systemd Service
Pasang terowongan sebagai layanan sistem agar otomatis aktif saat server di-reboot:
```bash
sudo cloudflared --config /root/.cloudflared/config.yml service install
sudo systemctl start cloudflared
sudo systemctl enable cloudflared
```
Periksa status terowongan Anda:
```bash
sudo systemctl status cloudflared
```
Sistem sekarang sudah online dan dapat diakses dengan aman melalui HTTPS di **`https://wms.rionlab.space`**.
