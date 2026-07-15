# Panduan Server & Maintenance (Server Manual)

Panduan ini berisi informasi teknis yang ditujukan bagi System Administrator, DevOps, atau Developer yang bertanggung jawab untuk memasang (setup), memelihara (maintain), mencadangkan (backup), dan memperbarui (update) sistem **Gudang Piala Kaltim WMS** di server production.

Aplikasi production dilayani pada domain:
🌐 **`wms.rionlab.space`**

---

## Daftar Isi Panduan Server

Silakan klik tautan di bawah ini untuk mempelajari administrasi server:

1. **[Arsitektur Server & Alur Ingress](./01_architecture.md)**
   * Gambaran umum teknologi server (Ubuntu 24.04 LTS + Docker Compose + Cloudflare Tunnel).
   * Penjelasan mengapa tidak membutuhkan public port forwarding.
2. **[Pemasangan Baru (Server Setup Guide)](./02_setup.md)**
   * Kloning repositori kode ke VPS.
   * Konfigurasi berkas `.env` dan inisialisasi server otomatis melalui skrip `setup_vps.sh`.
   * Menghubungkan Cloudflare Zero Trust Tunnel ke server lokal port 80.
3. **[Operasional & Pemeliharaan Rutin](./03_maintenance.md)**
   * Perintah Docker Compose untuk me-restart, mematikan, atau menghidupkan stack aplikasi.
   * Cara memeriksa log container backend dan frontend secara real-time.
   * Konfigurasi rotasi log otomatis untuk mencegah kehabisan kapasitas disk host.
4. **[Pencadangan & Pemulihan (Backup & Recovery)](./04_backup_recovery.md)**
   * Skrip otomatisasi backup berkala berbasis database dump PostgreSQL.
   * Penjadwalan backup otomatis melalui Cron Job di server host.
   * Prosedur verifikasi keabsahan backup (`verify_backup.sh`).
   * Prosedur pemulihan bencana (*Disaster Recovery*) langkah-demi-langkah.
5. **[Pembaruan Sistem & Migrasi Database](./05_system_updates.md)**
   * Langkah aman menarik pembaruan kode terbaru dari Git.
   * Menjalankan migrasi struktur database Postgres menggunakan Alembic di dalam container.
6. **[Pemecahan Masalah (Troubleshooting)](./06_troubleshooting.md)**
   * Penanganan error koneksi database, tunnel offline, atau kontainer berhenti tiba-tiba.
   * Cara mengakses dokumentasi interaktif Swagger API (`/docs`) di lingkungan produksi yang dilindungi oleh HTTPBasic Authentication.

---

> [!IMPORTANT]
> **Kebijakan Keamanan:**
> Server VPS tidak boleh membuka port publik apa pun kecuali port SSH yang aman. Seluruh trafik web masuk wajib dialirkan secara terenkripsi melewati terowongan Cloudflare Zero Trust Tunnel untuk mencegah ancaman pemindaian port (*port scanning*) dan serangan DDoS langsung pada alamat IP publik server.
