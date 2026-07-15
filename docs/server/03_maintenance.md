# 03. Operasional & Pemeliharaan Rutin

Halaman ini berisi panduan untuk melakukan operasi harian dan pemeliharaan server secara berkala guna memastikan aplikasi berjalan tanpa gangguan (*downtime*).

---

## 1. Manajemen Kontainer (Docker Compose)

Semua operasi dijalankan dari direktori root aplikasi di `/opt/wms`.

* **Memeriksa Status Layanan:**
  ```bash
  docker compose -f docker-compose.prod.yml ps
  ```
* **Me-restart Semua Layanan:**
  ```bash
  docker compose -f docker-compose.prod.yml restart
  ```
* **Menghentikan Sementara Aplikasi:**
  ```bash
  docker compose -f docker-compose.prod.yml down
  ```
  *(Catatan: Perintah ini menghentikan kontainer secara aman tanpa menghapus data persisten di database volume).*
* **Menjalankan Kembali Aplikasi (Detached Mode):**
  ```bash
  docker compose -f docker-compose.prod.yml up -d
  ```

---

## 2. Pemantauan Log Kontainer (Logging)

Kontainer Docker berjalan di latar belakang dan menuliskan log aktivitasnya. Gunakan perintah berikut untuk melacak jika ada kesalahan sistem:

* **Melihat Log Backend (API & Ledger Logik):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f backend
  ```
* **Melihat Log Frontend (Nginx Server & Traffic Proxying):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f frontend
  ```
* **Melihat Log Database (PostgreSQL Queries):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f db
  ```
* **Melihat Log Gabungan (Seluruh Kontainer):**
  ```bash
  docker compose -f docker-compose.prod.yml logs -f --tail 100
  ```

---

## 3. Kebijakan Rotasi Log (Log Rotation Policy)

Secara default, Docker dapat menampung berkas log tanpa batas hingga kapasitas disk host penuh. Untuk menghindari hal ini, file `docker-compose.prod.yml` kami telah dikonfigurasi dengan aturan rotasi log otomatis:

```yaml
logging:
  driver: "json-file"
  options:
    max-size: "10m"
    max-file: "3"
```
* **Artinya:** Setiap kontainer hanya akan menyimpan maksimal 3 file log dengan ukuran masing-masing tidak melebihi 10 Megabyte. Log lama akan otomatis dihapus saat batas terlampaui.

---

## 4. Pemeliharaan Cloudflare Tunnel

Karena Cloudflare Tunnel dipasang sebagai layanan sistem `systemd` pada host Ubuntu:

* **Memeriksa Keaktifan Terowongan:**
  ```bash
  sudo systemctl status cloudflared
  ```
* **Restart Layanan Tunnel (Jika koneksi internet VPS sempat terputus):**
  ```bash
  sudo systemctl restart cloudflared
  ```

---

## 5. Pemantauan Penyimpanan Disk (Disk Space Alert)

Meskipun log telah dirotasi, volume gambar unggahan dan database postgres akan terus tumbuh seiring waktu. Administrator disarankan memantau ruang kosong disk secara berkala dengan perintah:
```bash
df -h /
```
Jika kapasitas disk mendekati 90%, lakukan pembersihan cache docker yang tidak terpakai menggunakan:
```bash
docker system prune -f
```
*(Perintah prune ini aman dijalankan dan tidak akan menghapus data biner volume database atau folder unggahan yang sedang aktif).*
