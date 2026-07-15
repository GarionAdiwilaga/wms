import { useState, useMemo } from 'react';
import { Image as ImageIcon, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { useCategories } from '../../hooks/useCategories';
import { useSuppliers } from '../../hooks/useSuppliers';
import { useItems } from '../../hooks/useItems';
import { useBranchStocks, BranchStock } from '../../hooks/useBranchStocks';
import { ItemSearch } from '../../components/common/ItemSearch';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaginationControl } from '../../components/ui/PaginationControl';
import { ImageLightbox } from '../../components/common/ImageLightbox';

export function BranchStocksPage() {
  const currentUser = useAuthStore((state) => state.user);
  
  const { data: branches, isLoading: loadingBranches } = useBranches();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: itemsResponse } = useItems({ page_size: 1000 });

  // Filters State
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState('');
  
  // Set default branch for branch heads / staff or empty for super admin (all branches)
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const defaultBranch = (isSuperAdmin ? null : currentUser?.branch_id) ?? null;
  const [branchId, setBranchId] = useState<number | null>(defaultBranch);
  
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [supplierId, setSupplierId] = useState<number | null>(null);
  const [lowStockOnly, setLowStockOnly] = useState(false);

  // Fetch Branch Stocks
  const { data: stocksResponse, isLoading: loadingStocks, error } = useBranchStocks({
    page,
    page_size: pageSize,
    branch_id: branchId,
    category_id: categoryId,
    supplier_id: supplierId,
    search: search,
    low_stock_only: lowStockOnly,
  });

  // Construct item image lookup map
  const itemImageMap = useMemo(() => {
    const map: Record<number, string | null> = {};
    if (itemsResponse?.data) {
      itemsResponse.data.forEach((item) => {
        map[item.item_id] = item.image_url;
      });
    }
    return map;
  }, [itemsResponse]);

  // Construct branch name lookup map
  const branchMap = useMemo(() => {
    const map: Record<number, string> = {};
    if (branches) {
      branches.forEach((b) => {
        map[b.branch_id] = b.name;
      });
    }
    return map;
  }, [branches]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSearch('');
    if (isSuperAdmin) {
      setBranchId(null);
    }
    setCategoryId(null);
    setSupplierId(null);
    setLowStockOnly(false);
    setPage(1);
  };

  const renderStatusBadge = (stock: BranchStock) => {
    let badgeStyle = "bg-emerald-500/10 text-emerald-500 border border-emerald-500/25";
    let Icon = CheckCircle;
    let label = "Stok Aman";

    if (stock.quantity === 0) {
      badgeStyle = "bg-rose-500/10 text-rose-500 border border-rose-500/25";
      Icon = XCircle;
      label = "Stok Habis";
    } else if (stock.quantity <= (stock.minimum_stock ?? 0)) {
      badgeStyle = "bg-amber-500/10 text-amber-500 border border-amber-500/25";
      Icon = AlertTriangle;
      label = "Stok Menipis";
    }

    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${badgeStyle}`}>
        <Icon className="h-3 w-3" />
        {label}
      </span>
    );
  };

  const hasActiveFilters = search || (isSuperAdmin && branchId !== null) || categoryId !== null || supplierId !== null || lowStockOnly;

  if (error) {
    return <div className="text-red-500 p-6">Gagal memuat data stok gudang.</div>;
  }

  const isLoadingInitial = loadingBranches || loadingCategories || loadingSuppliers || loadingStocks;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Stok Gudang"
        description="Pantau ketersediaan stok barang dan status minimum stock di setiap cabang."
      />

      {/* Filters Section */}
      <div className="bg-card border border-border rounded-xl p-5 space-y-4 shadow-lg">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Reusable ItemSearch as Page Filter */}
          <div className="lg:col-span-2">
            <ItemSearch
              value={search}
              onChange={handleSearchChange}
              showDropdown={false}
              placeholder="Cari nama, kode barang..."
            />
          </div>

          {/* Branch Filter (Super Admin Only) */}
          {isSuperAdmin ? (
            <>
              <label htmlFor="branch_filter" className="sr-only">Cabang</label>
              <select
                id="branch_filter"
                name="branch_filter"
                value={branchId || 0}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setBranchId(val || null);
                  setPage(1);
                }}
                className="w-full rounded-xl border border-border bg-background p-2 text-sm text-foreground focus:border-primary focus:ring-1 focus:ring-primary focus:outline-none min-h-[44px] shadow-sm transition-colors"
              >
                <option value={0}>Semua Cabang</option>
                {branches?.map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </>
          ) : (
            <div className="w-full rounded-xl border border-border bg-background/50 p-3 text-sm text-muted-foreground min-h-[44px] flex items-center shadow-sm">
              Cabang: {branchMap[currentUser?.branch_id ?? 0] || 'Memuat...'}
            </div>
          )}

          {/* Category Filter */}
          <label htmlFor="category_filter" className="sr-only">Kategori</label>
          <select
            id="category_filter"
            name="category_filter"
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
          <label htmlFor="supplier_filter" className="sr-only">Supplier</label>
          <select
            id="supplier_filter"
            name="supplier_filter"
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
        </div>

        {/* Checkbox and Reset Filters Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <label htmlFor="low_stock_only" className="inline-flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none min-h-[44px]">
            <input
              id="low_stock_only"
              name="low_stock_only"
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-border bg-background text-primary focus:ring-primary focus:ring-offset-background"
            />
            Tampilkan Stok Menipis Saja
          </label>

          {hasActiveFilters && (
            <motion.div whileTap={{ scale: 0.97 }}>
              <Button
                variant="ghost"
                onClick={handleResetFilters}
                className="text-muted-foreground hover:text-foreground hover:bg-accent min-h-[44px] px-4 rounded-lg"
              >
                Reset Filter
              </Button>
            </motion.div>
          )}
        </div>
      </div>

      {/* Main Stock List */}
      {isLoadingInitial ? (
        <LoadingState />
      ) : stocksResponse?.data.length === 0 ? (
        <div className="py-4">
          <EmptyState
            title={hasActiveFilters ? "Stok barang tidak ditemukan" : "Data stok kosong"}
            description={hasActiveFilters ? "Coba ubah kombinasi filter atau kata kunci pencarian Anda." : "Belum ada transaksi stok barang di cabang ini."}
          />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Responsive Card Grid View */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {stocksResponse?.data.map((stock) => {
              const image = itemImageMap[stock.item_id];
              const formattedDate = new Date(stock.updated_at).toLocaleDateString('id-ID', {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={`${stock.branch_id}-${stock.item_id}`}
                  className="bg-card border border-border rounded-xl p-5 flex flex-col justify-between shadow-lg hover:shadow-xl transition-all hover:border-slate-800"
                >
                  <div className="space-y-3">
                    {/* Top Row: Image & Primary Attributes */}
                    <div className="flex gap-4 items-start">
                      <div className="h-16 w-16 rounded-xl overflow-hidden bg-background border border-border flex items-center justify-center flex-shrink-0">
                        {image ? (
                          <ImageLightbox src={image} alt={stock.item_name || ''} triggerClassName="h-full w-full">
                            <img src={image} alt={stock.item_name || ''} className="h-full w-full object-cover" />
                          </ImageLightbox>
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <span className="font-mono text-xs font-bold text-amber-500 tracking-wide block mb-1">
                          {stock.item_code}
                        </span>
                        <h4 className="text-sm font-bold text-foreground leading-tight line-clamp-2" title={stock.item_name}>
                          {stock.item_name}
                        </h4>
                      </div>
                    </div>

                    {/* Middle: Attributes Metadata Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground pt-3 border-t border-border/40">
                      {isSuperAdmin && (
                        <div className="col-span-2">
                          <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Cabang</span>
                          <span className="text-foreground font-semibold truncate block" title={branchMap[stock.branch_id] || ''}>
                            {branchMap[stock.branch_id] || '-'}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Kategori</span>
                        <span className="text-foreground font-semibold truncate block" title={stock.category_name || ''}>
                          {stock.category_name || '-'}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Supplier</span>
                        <span className="text-foreground font-semibold truncate block" title={stock.supplier_name || ''}>
                          {stock.supplier_name || '-'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bottom: Quantity, Status Badge & Last Updated */}
                  <div className="mt-4 pt-3 border-t border-border/40 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider block">Total Stok</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-lg font-extrabold text-white font-mono">{stock.quantity}</span>
                          <span className="text-xs text-slate-400 font-medium">{stock.uom_name || 'PCS'}</span>
                          <span className="text-[10px] text-slate-500 ml-1.5">(Min: {stock.minimum_stock})</span>
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {renderStatusBadge(stock)}
                      </div>
                    </div>
                    
                    <div className="flex justify-between items-center text-[10px] text-slate-500 border-t border-slate-900/50 pt-2">
                      <span>Terakhir Update</span>
                      <span className="font-mono">{formattedDate}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination Controls */}
          {stocksResponse && (
            <PaginationControl
              currentPage={page}
              totalPages={stocksResponse.total_pages}
              totalItems={stocksResponse.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      )}
    </div>
  );
}
