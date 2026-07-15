# 04. Pencadangan & Pemulihan (Backup & Recovery)

Keamanan data adalah prioritas utama. Modul ini menjelaskan kebijakan pencadangan (*backup*), otomatisasi penjadwalan, verifikasi kelayakan file backup, pemulihan bencana (*disaster recovery*), serta proses persiapan Go-Live.

---

## 1. Perintah Dasar Backup Database (PostgreSQL Dump)

Aplikasi WMS menggunakan PostgreSQL yang berjalan di dalam kontainer Docker bernama `gpk_db_prod` (sesuai `docker-compose.prod.yml`). Perintah untuk mengekspor database secara manual ke file SQL dump:

```bash
docker exec gpk_db_prod pg_dump -U postgres gudang_piala_kaltim > /var/backups/wms/wms_backup_$(date +%F).sql
```

---

## 2. Penjadwalan Backup Otomatis (Cron Job)

Disarankan untuk melakukan backup harian otomatis pada jam sepi aktivitas (misalnya pukul 01:00 dini hari).

### Cara Mengonfigurasi Cron Job di Ubuntu VPS Host:
1. Masuk ke terminal host dan jalankan editor cron:
   ```bash
   sudo crontab -e
   ```
2. Tambahkan baris konfigurasi berikut di bagian paling bawah file:
   ```cron
   0 1 * * * docker exec gpk_db_prod pg_dump -U postgres gudang_piala_kaltim > /var/backups/wms/wms_backup_$(date +\%F).sql 2>&1
   ```
3. Simpan dan keluar dari editor. Layanan cron sekarang akan membuat file backup baru setiap hari pada pukul 01:00.
4. **Kebijakan Retensi:** Pastikan Anda memiliki script untuk membersihkan file backup yang berumur lebih dari 30 hari guna menghemat ruang disk host (misalnya menggunakan perintah `find /var/backups/wms/ -mtime +30 -type f -delete`).

---

## 3. Uji Coba Verifikasi Backup (Rehearsal)

Backup data tidak ada gunanya jika file dump yang dihasilkan rusak dan tidak bisa di-restore. Kami menyediakan skrip otomatis untuk menyimulasikan siklus pemulihan data pada database sementara (`wms_verify_temp`).

### Cara Menjalankan Verifikasi:
Jalankan perintah berikut langsung dari shell VPS Anda:
```bash
/opt/wms/backend/scripts/verify_backup.sh
```
**Apa yang dilakukan skrip ini?**
1. Membuat backup live database saat ini.
2. Membuat database sementara bernama `wms_verify_temp` di PostgreSQL.
3. Mencoba mengimpor berkas backup tersebut ke database sementara.
4. Menjalankan query pengecekan integritas tabel untuk memastikan struktur data utuh.
5. Menghapus database sementara tersebut.
6. Menampilkan output hasil verifikasi. Pastikan skrip mengembalikan pesan:
   `✅ BACKUP VERIFICATION SUCCESSFUL!`

---

## 4. Prosedur Pemulihan Bencana (Disaster Recovery)

Jika database utama rusak, terhapus, atau mengalami korupsi data, ikuti langkah-langkah pemulihan berikut dengan sangat teliti:

1. **Hentikan Layanan Backend** terlebih dahulu agar tidak ada koneksi API baru yang masuk selama pemulihan:
   ```bash
   docker compose -f /opt/wms/docker-compose.prod.yml stop backend
   ```
2. **Hapus database lama dan buat database kosong baru** di dalam kontainer DB:
   ```bash
   docker exec -i gpk_db_prod psql -U postgres -c "DROP DATABASE gudang_piala_kaltim;"
   docker exec -i gpk_db_prod psql -U postgres -c "CREATE DATABASE gudang_piala_kaltim;"
   ```
3. **Impor data dari berkas SQL dump pilihan Anda** (misal backup dari tanggal kemarin):
   ```bash
   cat /var/backups/wms/wms_backup_YYYY-MM-DD.sql | docker exec -i gpk_db_prod psql -U postgres -d gudang_piala_kaltim
   ```
4. **Aktifkan kembali layanan backend**:
   ```bash
   docker compose -f /opt/wms/docker-compose.prod.yml start backend
   ```
5. Buka aplikasi di browser untuk memverifikasi bahwa data telah pulih ke titik waktu backup tersebut.

---

## 5. Persiapan Go-Live (Reset Transaksi UAT/Pilot)

Jika Anda telah selesai melakukan pengujian sistem (UAT / User Acceptance Testing) atau masa uji coba Pilot run, dan ingin menghapus seluruh data transaksi palsu sebelum aplikasi digunakan secara resmi (Go-Live) **tanpa menghapus data master (Items, Categories, Suppliers, Users, Branches)**:

Jalankan perintah script khusus di kontainer backend:
```bash
docker compose -f /opt/wms/docker-compose.prod.yml exec backend python scripts/prepare_go_live.py
```
* **Perilaku Script:**
  * Menghapus seluruh riwayat transaksi di ledger (`inventory_transactions`).
  * Mengosongkan keranjang outbound dan draft opname/transfer.
  * Mengosongkan tabel `transfers`, `transfer_lines`, dan `stock_opnames`.
  * Mereset nilai cache stok barang di semua cabang (`branch_stocks`) menjadi 0.
  * Mereset seluruh sequence ID tabel agar ID transaksi kembali dimulai dari angka 1.
  * **PENTING:** Script ini dilengkapi dengan konfirmasi interaktif keamanan untuk mencegah eksekusi yang tidak disengaja. Ikuti instruksi di layar untuk melanjutkan.
