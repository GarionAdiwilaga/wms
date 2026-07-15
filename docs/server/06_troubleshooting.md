# 06. Pemecahan Masalah (Troubleshooting)

Halaman ini mendokumentasikan kendala umum yang mungkin terjadi selama pengoperasian server Gudang Piala Kaltim WMS beserta langkah penyelesaiannya.

---

## 1. Aplikasi Menampilkan Error "502 Bad Gateway" di Browser

Pesan error ini berasal dari Cloudflare Tunnel atau Nginx yang tidak dapat menghubungi layanan di belakangnya (biasanya kontainer backend/frontend mati).

### Langkah Deteksi:
1. SSH ke VPS Anda.
2. Periksa status kontainer:
   ```bash
   docker compose -f /opt/wms/docker-compose.prod.yml ps
   ```
3. **Skenario A: Kontainer `gpk_backend_prod` atau `gpk_frontend_prod` berstatus `Exit`:**
   * Lihat log untuk mendeteksi penyebab matinya kontainer:
     ```bash
     docker compose -f /opt/wms/docker-compose.prod.yml logs backend
     ```
   * Hidupkan kembali layanan:
     ```bash
     docker compose -f /opt/wms/docker-compose.prod.yml up -d
     ```
4. **Skenario B: Kontainer DB mati / restart terus menerus:**
   * Hal ini biasanya dikarenakan error inisialisasi volume data database atau kerusakan file biner postgres. Periksa log database:
     ```bash
     docker compose -f /opt/wms/docker-compose.prod.yml logs db
     ```

---

## 2. Koneksi Database Error (FastAPI gagal terhubung ke Postgres)

Di log backend muncul pesan `psycopg2.OperationalError: connection to server at "db" ... failed`.

### Langkah Penyelesaian:
1. Pastikan kontainer database `gpk_db_prod` dalam keadaan sehat (`Up`).
2. Periksa kembali isi berkas konfigurasi `/opt/wms/.env`. Pastikan password database `POSTGRES_PASSWORD` cocok dengan nilai konfigurasi di backend.
3. Jika password baru saja diubah di file `.env`, kontainer database harus dimatikan terlebih dahulu secara penuh agar perubahan dapat di-apply ke internal volume:
   ```bash
   docker compose -f /opt/wms/docker-compose.prod.yml down
   docker compose -f /opt/wms/docker-compose.prod.yml up -d
   ```

---

## 3. Situs Tidak Dapat Diakses Secara Keseluruhan (Cloudflare Tunnel Offline)

Jika domain `wms.rionlab.space` menampilkan pesan error "Cloudflare Tunnel Error 1033", artinya agen `cloudflared` di VPS Anda mati atau gagal melakukan koneksi ke Cloudflare Edge.

### Langkah Penyelesaian:
1. Periksa status layanan `cloudflared` di host VPS:
   ```bash
   sudo systemctl status cloudflared
   ```
2. Jika berstatus `inactive` atau `failed`, nyalakan kembali layanan:
   ```bash
   sudo systemctl restart cloudflared
   ```
3. Jika masih offline, periksa log koneksi tunnel:
   ```bash
   sudo journalctl -u cloudflared -f -n 50
   ```
   * *Kemungkinan penyebab:* VPS kehilangan koneksi internet, berkas konfigurasi tunnel di `/root/.cloudflared/` terhapus, atau masa berlaku token tunnel dari dashboard Cloudflare Zero Trust telah kedaluwarsa.

---

## 4. Akses Dokumentasi API (Swagger /docs) di Produksi

Secara default di FastAPI, dokumentasi interaktif Swagger (`/docs`, `/redoc`, `/openapi.json`) sering kali dimatikan pada mode produksi demi alasan keamanan. Namun, pada sistem ini, Swagger tetap dinyalakan tetapi **dilindungi secara ketat di belakang HTTPBasic Authentication**.

* **Alamat Swagger:**
  `https://wms.rionlab.space/docs`
* **Kredensial Akses:**
  * Saat halaman dibuka, browser akan memunculkan dialog pop-up berisi kolom *Username* dan *Password*.
  * **Username:** `admin` (atau username lain yang memiliki peran `super_admin`).
  * **Password:** Sandi yang sesuai dengan akun super_admin tersebut.
* **Aturan Teknis:**
  * Di lingkungan pengembangan (`ENVIRONMENT=development`), Swagger dapat diakses secara bebas tanpa dialog autentikasi dasar (*HTTPBasic Auth*).
  * Di lingkungan produksi (`ENVIRONMENT=production`), verifikasi akun `super_admin` wajib lolos sebelum dokumen API dapat dimuat ke layar.
