import { useState, useRef } from 'react';
import { Plus, Edit2, QrCode, Search, X, Image as ImageIcon, Camera } from 'lucide-react';
import { useAuthStore } from '../../store/auth-store';
import { useCategories } from '../../hooks/useCategories';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useItems, Item } from '../../hooks/useItems';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ResponsiveDataTable, Column } from '../../components/ui/ResponsiveDataTable';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { ItemFormDialog } from './components/ItemFormDialog';
import { QRViewDialog } from './components/QRViewDialog';
import { Html5Qrcode } from 'html5-qrcode';

export function ItemsPage() {
  const user = useAuthStore((state) => state.user);
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();

  // Filters State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState<boolean | null>(true); // default to active items

  // Dialogs State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Item | null>(null);
  const [isQRViewOpen, setIsQRViewOpen] = useState(false);
  const [qrItem, setQRItem] = useState<Item | null>(null);

  // Scanner State for filtering by scan
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerId = 'items-page-filter-scanner';
  const scannerInstanceRef = useRef<Html5Qrcode | null>(null);

  // Fetch Items
  const { data: itemsResponse, isLoading, error, refetch } = useItems({
    page,
    page_size: pageSize,
    category_id: categoryId,
    supplier_id: supplierId,
    q: search,
    is_active: isActive
  });

  const canEdit = user?.role === 'super_admin';

  const handleOpenCreate = () => {
    setEditingItem(null);
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item: Item) => {
    setEditingItem(item);
    setIsFormOpen(true);
  };

  const handleOpenQR = (item: Item) => {
    setQRItem(item);
    setIsQRViewOpen(true);
  };

  // Start QR Scanning to filter list
  const startScanning = () => {
    setIsScanning(true);
    setCameraError(null);
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        scannerInstanceRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => {
              const minDimension = Math.min(width, height);
              const qrSize = Math.floor(minDimension * 0.65);
              return { width: qrSize, height: qrSize };
            }
          },
          (decodedText) => {
            // Populate search input with scanned item_code
            setSearch(decodedText);
            setPage(1);
            stopScanning();
          },
          () => {}
        );
      } catch (err: any) {
        console.error(err);
        setCameraError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
      }
    }, 300);
  };

  const stopScanning = () => {
    if (scannerInstanceRef.current) {
      scannerInstanceRef.current.stop()
        .then(() => {
          scannerInstanceRef.current = null;
        })
        .catch(console.error);
    }
    setIsScanning(false);
  };

  // Desktop columns configuration
  const columns: Column<Item>[] = [
    {
      header: 'Foto',
      cell: (item) => (
        <div className="h-10 w-10 rounded overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-slate-600" />
          )}
        </div>
      ),
    },
    { 
      header: 'Kode', 
      cell: (item) => <span className="font-mono font-bold text-amber-500">{item.item_code}</span> 
    },
    { header: 'Nama Barang', accessorKey: 'name' },
    { header: 'Kategori', cell: (item) => item.category?.name || '-' },
    { header: 'Merk/Supplier', cell: (item) => item.supplier?.name || '-' },
    { header: 'Stok Minimal', accessorKey: 'minimum_stock' },
    {
      header: 'Status',
      cell: (item) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
          {item.is_active ? 'Aktif' : 'Non-aktif'}
        </span>
      ),
    },
    {
      header: 'Aksi',
      cell: (item) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="icon" onClick={() => handleOpenQR(item)} className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title="Cetak QR">
            <QrCode className="h-4 w-4" />
          </Button>
          {canEdit && (
            <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" title="Ubah">
              <Edit2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      ),
    },
  ];

  if (error) return <div className="text-red-500 p-4">Gagal memuat katalog barang.</div>;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Katalog Barang"
        description="Daftar komponen trophy, plakat, medali, dan merchandise."
        action={
          canEdit && (
            <Button onClick={handleOpenCreate} className="bg-amber-500 hover:bg-amber-600 text-slate-950 min-h-[44px]">
              <Plus className="mr-2 h-4 w-4" /> Tambah Barang
            </Button>
          )
        }
      />

      {/* Filters Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative flex items-center lg:col-span-2">
            <Search className="absolute left-3 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Cari nama atau kode barang..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-10 bg-slate-950 border-slate-800 focus-visible:ring-amber-500 text-white min-h-[40px]"
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={startScanning}
              className="absolute right-1 text-slate-400 hover:text-amber-500 hover:bg-transparent min-h-[36px] min-w-[36px]"
              title="Filter dengan scan QR"
            >
              <Camera className="h-4 w-4" />
            </Button>
          </div>

          {/* Category Filter */}
          <select
            value={categoryId || 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCategoryId(val || null);
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-white focus:border-amber-500 focus:outline-none min-h-[40px]"
          >
            <option value={0}>Semua Kategori</option>
            {categories?.map((c) => (
              <option key={c.category_id} value={c.category_id}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Supplier Filter */}
          <select
            value={supplierId || 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              setSupplierId(val || null);
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-white focus:border-amber-500 focus:outline-none min-h-[40px]"
          >
            <option value={0}>Semua Merk/Supplier</option>
            {suppliers?.map((s) => (
              <option key={s.supplier_id} value={s.supplier_id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={isActive === null ? 'all' : isActive ? 'active' : 'inactive'}
            onChange={(e) => {
              const val = e.target.value;
              setIsActive(val === 'all' ? null : val === 'active');
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-white focus:border-amber-500 focus:outline-none min-h-[40px]"
          >
            <option value="active">Aktif</option>
            <option value="inactive">Non-aktif</option>
            <option value="all">Semua Status</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <LoadingState />
      ) : itemsResponse?.data.length === 0 ? (
        <EmptyState title="Barang tidak ditemukan" description="Coba ubah filter pencarian Anda." />
      ) : (
        <div className="space-y-4">
          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {itemsResponse?.data.map((item) => (
              <div key={item.item_id} className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex gap-4 items-start relative shadow-md">
                {/* Thumbnail */}
                <div className="h-16 w-16 rounded overflow-hidden bg-slate-950 border border-slate-850 flex items-center justify-center flex-shrink-0">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-slate-700" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-8">
                  <span className="font-mono text-xs font-bold text-amber-500 tracking-wide block mb-1">
                    {item.item_code}
                  </span>
                  <h4 className="text-sm font-semibold text-white truncate mb-1">{item.name}</h4>
                  <p className="text-xs text-slate-400 mb-1">
                    Kategori: <span className="text-slate-300 font-medium">{item.category?.name || '-'}</span>
                  </p>
                  <p className="text-xs text-slate-400 mb-2">
                    Merk/Brand: <span className="text-slate-300 font-medium">{item.supplier?.name || '-'}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      Min Stok: {item.minimum_stock}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold ${item.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-slate-800 text-slate-400'}`}>
                      {item.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>
                </div>

                {/* Actions overlay menu (secondary) */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <Button variant="ghost" size="icon" onClick={() => handleOpenQR(item)} className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10" title="Cetak QR">
                    <QrCode className="h-4 w-4" />
                  </Button>
                  {canEdit && (
                    <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10" title="Ubah">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block">
            <ResponsiveDataTable data={itemsResponse?.data || []} columns={columns} keyExtractor={(i) => i.item_id} />
          </div>

          {/* Pagination Controls */}
          {itemsResponse && itemsResponse.total_pages > 1 && (
            <div className="flex items-center justify-between px-2 py-4 border-t border-slate-900">
              <span className="text-xs text-slate-400">
                Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, itemsResponse.total)} dari {itemsResponse.total} barang
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => Math.max(p - 1, 1))}
                  className="border-slate-850 hover:bg-slate-900 text-white min-h-[36px]"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === itemsResponse.total_pages}
                  onClick={() => setPage(p => Math.min(p + 1, itemsResponse.total_pages))}
                  className="border-slate-850 hover:bg-slate-900 text-white min-h-[36px]"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Item Form Dialog */}
      <ItemFormDialog
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        item={editingItem}
        onSuccess={() => refetch()}
      />

      {/* QR Code Printable Dialog */}
      <QRViewDialog
        open={isQRViewOpen}
        onOpenChange={setIsQRViewOpen}
        item={qrItem}
      />

      {/* Filter scan overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative flex flex-col h-full md:h-auto max-h-[90vh]">
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="font-semibold text-white">Scan QR Barang (Filter)</h3>
              <Button type="button" variant="ghost" size="icon" onClick={stopScanning} className="text-slate-400 hover:text-white min-h-[40px] min-w-[40px]">
                <X className="h-5 w-5" />
              </Button>
            </div>
            <div className="flex-1 relative bg-black flex items-center justify-center min-h-[300px]">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-red-400">
                  <p className="text-sm font-medium mb-4">{cameraError}</p>
                  <Button type="button" variant="outline" onClick={stopScanning} className="border-slate-700 hover:bg-slate-800 text-white">Tutup</Button>
                </div>
              ) : (
                <div id={scannerId} className="w-full h-full object-cover"></div>
              )}
            </div>
            <div className="px-4 py-4 border-t border-slate-800 text-center text-xs text-slate-400">
              Arahkan kamera ke QR label barang untuk memfilter daftar barang.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
