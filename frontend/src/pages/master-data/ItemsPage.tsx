import { useState, useRef } from 'react';
import { Plus, Edit2, QrCode, Search, X, Image as ImageIcon, Camera } from 'lucide-react';
import { motion } from 'framer-motion';
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
  const scanTimeoutRef = useRef<any>(null);

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

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current as any);
    }

    scanTimeoutRef.current = setTimeout(async () => {
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
        scannerInstanceRef.current = null;
      }
    }, 300);
  };

  const stopScanning = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current as any);
      scanTimeoutRef.current = null;
    }

    if (scannerInstanceRef.current) {
      const stopPromise = scannerInstanceRef.current.isScanning
        ? scannerInstanceRef.current.stop()
        : Promise.resolve();
        
      stopPromise
        .catch(console.error)
        .finally(() => {
          scannerInstanceRef.current = null;
          setIsScanning(false);
          setCameraError(null);
        });
    } else {
      setIsScanning(false);
      setCameraError(null);
    }
  };

  // Desktop columns configuration
  const columns: Column<Item>[] = [
    {
      header: 'Foto',
      cell: (item) => (
        <div className="h-10 w-10 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center shadow-sm">
          {item.image_url ? (
            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-muted-foreground" />
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
        <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${item.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
          {item.is_active ? 'Aktif' : 'Non-aktif'}
        </span>
      ),
    },
    {
      header: 'Aksi',
      cell: (item) => (
        <div className="flex gap-2">
          <motion.div whileTap={{ scale: 0.9 }}>
            <Button variant="ghost" size="icon" onClick={() => handleOpenQR(item)} className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg" title="Cetak QR">
              <QrCode className="h-4 w-4" />
            </Button>
          </motion.div>
          {canEdit && (
            <motion.div whileTap={{ scale: 0.9 }}>
              <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg" title="Ubah">
                <Edit2 className="h-4 w-4" />
              </Button>
            </motion.div>
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
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button onClick={handleOpenCreate} className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground min-h-[44px] shadow-md rounded-xl">
                <Plus className="mr-2 h-4 w-4" /> Tambah Barang
              </Button>
            </motion.div>
          )
        }
      />

      {/* Filters Section */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Input */}
          <div className="relative flex items-center lg:col-span-2">
            <Search className="absolute left-3 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Cari nama atau kode barang..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="pl-9 pr-10 bg-background border-border focus-visible:ring-primary text-foreground min-h-[44px] rounded-xl shadow-sm"
            />
            <motion.div whileTap={{ scale: 0.9 }} className="absolute right-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={startScanning}
                className="text-muted-foreground hover:text-primary hover:bg-transparent min-h-[36px] min-w-[36px] rounded-lg"
                title="Filter dengan scan QR"
              >
                <Camera className="h-4 w-4" />
              </Button>
            </motion.div>
          </div>

          {/* Category Filter */}
          <select
            value={categoryId || 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCategoryId(val || null);
              setPage(1);
            }}
            className="w-full rounded-xl border border-border bg-background p-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none min-h-[44px] shadow-sm transition-colors"
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
            className="w-full rounded-xl border border-border bg-background p-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none min-h-[44px] shadow-sm transition-colors"
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
            className="w-full rounded-xl border border-border bg-background p-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none min-h-[44px] shadow-sm transition-colors"
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
              <div key={item.item_id} className="bg-card border border-border rounded-xl p-4 flex gap-4 items-start relative shadow-lg hover:shadow-xl transition-shadow">
                {/* Thumbnail */}
                <div className="h-16 w-16 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center flex-shrink-0 shadow-sm">
                  {item.image_url ? (
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  ) : (
                    <ImageIcon className="h-6 w-6 text-muted-foreground" />
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0 pr-8">
                  <span className="font-mono text-xs font-bold text-amber-500 tracking-wide block mb-1">
                    {item.item_code}
                  </span>
                  <h4 className="text-sm font-semibold text-foreground truncate mb-1">{item.name}</h4>
                  <p className="text-xs text-muted-foreground mb-1">
                    Kategori: <span className="text-foreground font-medium">{item.category?.name || '-'}</span>
                  </p>
                  <p className="text-xs text-muted-foreground mb-2">
                    Merk/Brand: <span className="text-foreground font-medium">{item.supplier?.name || '-'}</span>
                  </p>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground border border-border shadow-sm">
                      Min Stok: {item.minimum_stock}
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded font-semibold border ${item.is_active ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-muted text-muted-foreground border-border'}`}>
                      {item.is_active ? 'Aktif' : 'Non-aktif'}
                    </span>
                  </div>
                </div>

                {/* Actions overlay menu (secondary) */}
                <div className="absolute top-3 right-3 flex flex-col gap-2">
                  <motion.div whileTap={{ scale: 0.9 }}>
                    <Button variant="ghost" size="icon" onClick={() => handleOpenQR(item)} className="h-8 w-8 text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg" title="Cetak QR">
                      <QrCode className="h-4 w-4" />
                    </Button>
                  </motion.div>
                  {canEdit && (
                    <motion.div whileTap={{ scale: 0.9 }}>
                      <Button variant="ghost" size="icon" onClick={() => handleOpenEdit(item)} className="h-8 w-8 text-blue-400 hover:text-blue-300 hover:bg-blue-400/10 rounded-lg" title="Ubah">
                        <Edit2 className="h-4 w-4" />
                      </Button>
                    </motion.div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-lg">
            <ResponsiveDataTable data={itemsResponse?.data || []} columns={columns} keyExtractor={(i) => i.item_id} />
          </div>

          {/* Pagination Controls */}
          {itemsResponse && itemsResponse.total_pages > 1 && (
            <div className="flex items-center justify-between px-2 py-4 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, itemsResponse.total)} dari {itemsResponse.total} barang
              </span>
              <div className="flex gap-2">
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === 1}
                    onClick={() => setPage(p => Math.max(p - 1, 1))}
                    className="border-border hover:bg-accent text-foreground min-h-[36px] rounded-lg shadow-sm"
                  >
                    Sebelumnya
                  </Button>
                </motion.div>
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page === itemsResponse.total_pages}
                    onClick={() => setPage(p => Math.min(p + 1, itemsResponse.total_pages))}
                    className="border-border hover:bg-accent text-foreground min-h-[36px] rounded-lg shadow-sm"
                  >
                    Selanjutnya
                  </Button>
                </motion.div>
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
