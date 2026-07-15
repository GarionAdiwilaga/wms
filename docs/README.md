# Gudang Piala Kaltim WMS - Sistem Dokumentasi

Selamat datang di pusat dokumentasi **Gudang Piala Kaltim Warehouse Management System (WMS)**. Sistem ini dirancang untuk menggantikan pengelolaan stok berbasis spreadsheet menjadi sistem terpusat, real-time, dan modular.

Aplikasi produksi dapat diakses melalui tautan berikut:
🌐 **[wms.rionlab.space](https://wms.rionlab.space)**

---

## Struktur Dokumentasi

Dokumentasi ini dibagi menjadi dua kategori utama sesuai dengan peran dan kebutuhan pembaca:

### 👤 [Panduan Pengguna (User Manual)](./user/README.md)
Panduan operasional lengkap untuk pengguna akhir (staf gudang, kepala cabang, dan super admin) mengenai cara menggunakan seluruh modul aplikasi di lapangan.
* [Pendahuluan & Akses Peran](./user/README.md#daftar-isi)
* [Login & Manajemen Kata Sandi](./user/01_login_password.md)
* [Navigasi & Fitur Dashboard](./user/02_dashboard.md)
* [Pengelolaan Data Master](./user/03_master_data.md)
* [Alur Penerimaan Barang (Stock In)](./user/04_stock_in.md)
* [Alur Pengeluaran Barang (Outbound)](./user/05_outbound_cart.md)
* [Alur Transfer Antar Cabang (Branch Transfers)](./user/06_branch_transfers.md)
* [Penyesuaian Stok Fisik (Stock Opname)](./user/07_stock_opname.md)
* [Laporan Kinerja & Analitik](./user/08_reports_analytics.md)
* [Pelacakan Log Aktivitas (Audit Logs)](./user/09_audit_logs.md)

### 💻 [Panduan Server & Maintenance (Server Manual)](./server/README.md)
Panduan teknis bagi administrator sistem atau pengembang mengenai konfigurasi infrastruktur, proses deployment, pemeliharaan rutin, backup data, dan pemulihan sistem.
* [Arsitektur Server & Alur Ingress](./server/01_architecture.md)
* [Pemasangan Baru (Server Setup)](./server/02_setup.md)
* [Operasional & Pemeliharaan Rutin](./server/03_maintenance.md)
* [Pencadangan & Pemulihan (Backup & Recovery)](./server/04_backup_recovery.md)
* [Pembaruan Kode & Migrasi Database](./server/05_system_updates.md)
* [Pemecahan Masalah (Troubleshooting)](./server/06_troubleshooting.md)

---

## Manajemen Dokumentasi
Dokumentasi ini disusun secara modular agar mudah diperbarui seiring berkembangnya fitur aplikasi. Jika terdapat perubahan alur bisnis atau pembaruan teknis pada server, pastikan untuk memperbarui berkas Markdown yang relevan dalam direktori ini agar repositori tetap menjadi **Satu-satunya Sumber Kebenaran (Source of Truth)**.
