# Panduan Pengguna (User Manual) - WMS Gudang Piala Kaltim

Panduan ini ditujukan bagi seluruh tingkat pengguna sistem manajemen gudang, mulai dari Staf Gudang, Kepala Cabang, hingga Super Admin. Sistem ini dirancang secara khusus untuk dioperasikan pada perangkat seluler (smartphone dan tablet) di area gudang, serta komputer desktop di kantor.

---

## Matriks Peran & Hak Akses (Roles Matrix)

Untuk menjaga keamanan data dan alur kerja di gudang, sistem membagi hak akses ke dalam tiga jenis peran (roles). Berikut adalah rincian hak akses masing-masing peran:

| Fitur / Modul | Staf Gudang (`warehouse_staff`) | Kepala Cabang (`branch_head`) | Super Admin (`super_admin`) |
| :--- | :---: | :---: | :---: |
| **Login & Ganti Password** | ✅ | ✅ | ✅ |
| **Lihat Dashboard** | ✅ | ✅ | ✅ (Semua Cabang) |
| **Pencarian / Katalog Barang** | ✅ | ✅ | ✅ |
| **Stok Masuk (Stock In)** | ✅ | ✅ | ✅ |
| **Pengeluaran Barang (Outbound)** | ✅ | ✅ | ✅ |
| **Buat Transfer Cabang (Draft)** | ❌ | ✅ | ✅ |
| **Kirim Transfer (In Transit)** | ❌ | ✅ | ✅ |
| **Terima Transfer (Received)** | ❌ | ✅ | ✅ |
| **Stok Opname (Penyesuaian)** | ✅ | ✅ | ✅ |
| **Kelola Master Data** (Item, Supplier, Cabang) | ❌ | ❌ | ✅ |
| **Kelola Pengguna & Reset Password** | ❌ | ❌ | ✅ |
| **Lihat & Unduh Laporan** | ❌ | ✅ (Cabang Sendiri) | ✅ (Semua Cabang) |
| **Melihat Log Audit** | ❌ | ❌ | ✅ |

---

## Daftar Isi Panduan Pengguna

Silakan pilih topik panduan di bawah ini untuk mempelajari cara pengoperasian aplikasi:

1. **[Login & Manajemen Kata Sandi](./01_login_password.md)**
   * Cara mengakses aplikasi di `wms.rionlab.space`.
   * Batasan penulisan username dan cara mengganti kata sandi mandiri.
2. **[Navigasi & Fitur Dashboard](./02_dashboard.md)**
   * Informasi ringkasan stok, transfer tertunda, dan indikator stok rendah.
3. **[Pengelolaan Data Master (Khusus Super Admin)](./03_master_data.md)**
   * Menambahkan Supplier (sebagai Brand), Kategori Barang, Unit Satuan (UOM), Cabang, dan Pengguna baru.
   * Membuat item barang dan mencetak Label QR Code.
4. **[Alur Penerimaan Barang (Stock In)](./04_stock_in.md)**
   * Langkah-langkah memasukkan stok barang baru dari supplier ke dalam gudang cabang aktif.
5. **[Alur Pengeluaran Barang (Outbound)](./05_outbound_cart.md)**
   * Menggunakan keranjang pengeluaran barang (Point of Sales style) untuk mencatat barang keluar.
   * Aturan penomoran referensi dan penanganan stok habis (stok negatif tidak diperbolehkan).
6. **[Alur Transfer Antar Cabang (Branch Transfers)](./06_branch_transfers.md)**
   * Siklus hidup pengiriman barang antar cabang (Draft ➔ In Transit ➔ Received / Cancelled).
   * Cara menangani selisih barang (Variance) beserta pencatatan alasannya.
7. **[Penyesuaian Stok Fisik (Stock Opname)](./07_stock_opname.md)**
   * Langkah mencocokkan stok sistem dengan stok riil di gudang secara terjadwal berdasarkan kategori barang.
8. **[Laporan Kinerja & Analitik](./08_reports_analytics.md)**
   * Melihat dan mengunduh laporan PDF (Stok, Mutasi, Stok Rendah, Transfer, Log Audit).
   * Membaca grafik analisis perputaran barang dan performa operator gudang.
9. **[Pelacakan Log Aktivitas (Audit Logs)](./09_audit_logs.md)**
   * Memantau catatan riwayat transaksi sistem yang bersifat permanen (tidak dapat diubah/dihapus).

---

> [!TIP]
> Jika Anda mengalami kendala saat mengakses aplikasi atau memerlukan bantuan teknis (seperti reset kata sandi oleh Super Admin), silakan hubungi Administrator IT Anda.
