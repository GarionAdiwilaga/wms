# 03. Pengelolaan Data Master (Khusus Super Admin)

Modul Master Data adalah menu eksklusif bagi pengguna dengan peran **Super Admin**. Seluruh entitas di dalam Master Data bersifat **Global** (artinya data yang dibuat akan dibagikan dan dapat diakses oleh seluruh cabang).

---

## 1. Konsep "Supplier sebagai Brand"

Dalam bisnis Gudang Piala Kaltim, supplier berfungsi ganda sebagai penyedia barang sekaligus merek dagang (brand) produk. Oleh karena itu:
* Barang sejenis dari supplier berbeda dihitung sebagai produk yang berbeda di sistem.
* Contoh: `Stall 40cm` dari supplier `Onix` dianggap berbeda dengan `Stall 40cm` dari supplier `Funtrophy`. Masing-masing memiliki kode barang dan catatan stok yang terpisah.

---

## 2. Pendaftaran Entitas Dasar

Sebelum mendaftarkan barang baru, pastikan entitas pendukung berikut sudah diisi:
1. **Kategori (Categories):** Pengelompokan jenis barang (misal: Marmer, Akrilik, Figur, Resin, Tali Medali).
2. **Supplier (Suppliers):** Nama supplier, kontak person, nomor telepon, dan catatan tambahan.
3. **Cabang (Branches):** Lokasi gudang fisik (seperti Balikpapan - BPN, Samarinda - SMD, Bontang - BTG).
4. **Unit Satuan (UOM):** Satuan kuantitas barang (misal: pcs, lembar, meter, set, pak). *Catatan: Penghitungan sisa stok dalam ledger dilakukan dalam satuan PCS.*
5. **Pengguna (Users):** Pendaftaran akun baru, pemilihan peran (`warehouse_staff`, `branch_head`, atau `super_admin`), serta penempatan cabang tugasnya.

---

## 3. Pendaftaran & Pengelolaan Barang (Items)

Setiap barang harus terdaftar secara global sebelum stoknya dapat dimanipulasi di cabang mana pun.

### Formulir Tambah/Edit Barang
Untuk mendaftarkan barang baru, buka menu **Master Data ➔ Barang ➔ Tambah Barang**:
* **Nama Barang:** Deskripsi nama barang yang jelas (misal: Marmer Model A).
* **Kategori & Supplier:** Pilih dari daftar pilihan yang tersedia.
* **Kode Manual (Manual Code):** Kode angka/huruf dari katalog spreadsheet lama (misal: `001`, `A5`).
* **Satuan (UOM):** Pilih satuan barang (biasanya `pcs`).
* **Stok Minimum (Minimum Stock):** Batas minimal stok sebelum peringatan "Stok Rendah" menyala.
* **Gambar Barang:** Unggah foto produk untuk mempermudah staf gudang mengenali barang secara visual.
* **Status Aktif:** Barang yang tidak aktif (`is_active = false`) tidak akan muncul dalam menu pencarian operasional sehari-hari.

---

## 4. Format Kode Barang (Item Code)

Sistem secara otomatis menggenerasi kode barang unik dengan format:
$$\text{Kode Barang} = \text{\{Prefix Kategori\}}-\text{\{Prefix Supplier\}}-\text{\{Kode Manual\}}$$

* Contoh: Kategori **Marmer** (prefix `MRM`), Supplier **Onix** (prefix `ONX`), Kode Manual **001** ➔ **`MRM-ONX-001`**.
* Uniknya kode barang ini dijamin oleh sistem di tingkat database.

> [!IMPORTANT]
> **Imutabilitas Kode Barang:**
> Sekali kode barang didefinisikan (setelah tombol Simpan ditekan), **`item_code` tersebut bersifat permanen dan tidak dapat diubah lagi**. Jika Anda melakukan kesalahan pengisian kategori, supplier, atau kode manual, Anda harus menonaktifkan barang tersebut dan membuat barang baru. Hal ini untuk mencegah kerancuan data pada Label QR yang sudah terlanjur dicetak dan ditempel di gudang.

---

## 5. Pembuatan & Pencetakan Label QR Code

Sistem WMS memanfaatkan QR Code untuk mempercepat pencarian barang di gudang. QR Code ini murni berisi teks kode barang tersebut (misal: `MRM-ONX-001`).

### Cara Mencetak Label QR:
1. Masuk ke halaman **Master Data ➔ Barang**.
2. Klik tombol **Lihat QR** pada baris barang yang dipilih.
3. Dialog pratinjau QR Code akan muncul di layar.
4. Klik tombol **Cetak Label (Print)**.
5. Gunakan printer label standar untuk mencetak barcode QR tersebut dan tempelkan pada wadah/rak penyimpanan barang di gudang fisik.

