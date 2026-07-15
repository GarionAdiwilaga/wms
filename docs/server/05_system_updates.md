# 05. Pembaruan Sistem & Migrasi Database

Dokumen ini menjelaskan prosedur standar untuk memperbarui kode aplikasi WMS di server produksi dan mengaplikasikan perubahan struktur tabel database (migrasi schema) secara aman tanpa merusak data yang ada.

---

## Prosedur Standard Pembaruan Aplikasi (Standard Update Flow)

> [!IMPORTANT]
> **Pra-Pembaruan (Pre-update Backup):**
> Sebelum melakukan penarikan kode terbaru dari Git atau menjalankan migrasi database, **lakukan backup database secara manual terlebih dahulu** menggunakan prosedur di [Panduan Backup](./04_backup_recovery.md#1-perintah-dasar-backup-database-postgresql-dump). Hal ini memastikan Anda memiliki titik pemulihan jika pembaruan baru mengalami kegagalan fatal.

Ikuti urutan langkah berikut di terminal VPS:

### Langkah 1: Ambil Kode Terbaru dari Repositori Git
Masuk ke direktori aplikasi dan lakukan penarikan (*pull*) kode:
```bash
cd /opt/wms
git pull origin main
```
*(Catatan: Jika ada revisi tag rilis tertentu, Anda dapat berpindah ke tag tersebut dengan `git checkout tags/vX.Y.Z`).*

### Langkah 2: Bangun Ulang Kontainer Docker (Rebuild Stack)
Jalankan perintah build untuk memperbarui image kontainer (Nginx frontend & FastAPI backend) dengan kode yang baru ditarik:
```bash
docker compose -f docker-compose.prod.yml up -d --build
```
* Perintah ini akan membangun kembali image yang mendeteksi perubahan berkas statis React maupun script Python backend.
* Layanan kontainer akan digantikan (*replace*) secara otomatis dengan *downtime* yang sangat minimal (hitungan detik).

---

## 2. Migrasi Database (Database Migration via Alembic)

Jika pembaruan kode baru menyertakan perubahan struktur tabel database (misal penambahan kolom baru atau tabel baru), Anda harus menerapkan migrasi database menggunakan Alembic.

Alembic berjalan di dalam kontainer `backend`.

### Langkah 2.1: Periksa Riwayat Migrasi (Opsional)
Untuk melihat riwayat migrasi yang sudah pernah diterapkan pada database:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic history
```

### Langkah 2.2: Jalankan Peningkatan Struktur Database (Upgrade Head)
Gunakan perintah berikut untuk menaikkan versi schema database ke versi paling baru yang terdaftar di berkas migrasi:
```bash
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head
```
Jika migrasi berhasil, sistem akan mencetak log peningkatan dari versi sebelumnya menuju versi target dengan tulisan `Running upgrade ...`.

---

## 3. Langkah Pasca-Pembaruan (Post-update Validation)

Setelah pembaruan selesai dilakukan:
1. Bersihkan cache browser Anda (terutama jika ada pembaruan visual yang tidak muncul secara instan karena cache React SPA).
2. Akses **`https://wms.rionlab.space`** dan pastikan halaman Login muncul dengan benar.
3. Masuk ke halaman **Dashboard** dan periksa apakah data stok barang dan log aktivitas tetap utuh dan akurat.
4. Periksa log kontainer backend untuk memastikan tidak ada error startup aplikasi:
   ```bash
   docker compose -f docker-compose.prod.yml logs -f backend
   ```
