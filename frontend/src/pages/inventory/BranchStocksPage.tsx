import { useState, useMemo } from 'react';
import { Image as ImageIcon, CheckCircle, AlertTriangle, XCircle } from 'lucide-react';
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

export function BranchStocksPage() {
  const currentUser = useAuthStore((state) => state.user);
  
  const { data: branches, isLoading: loadingBranches } = useBranches();
  const { data: categories, isLoading: loadingCategories } = useCategories();
  const { data: suppliers, isLoading: loadingSuppliers } = useSuppliers();
  const { data: itemsResponse } = useItems({ page_size: 1000 });

  // Filters State
  const [page, setPage] = useState(1);
  const [pageSize] = useState(10);
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
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-4">
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
            <select
              value={branchId || 0}
              onChange={(e) => {
                const val = Number(e.target.value);
                setBranchId(val || null);
                setPage(1);
              }}
              className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-white focus:border-amber-500 focus:outline-none min-h-[44px]"
            >
              <option value={0}>Semua Cabang</option>
              {branches?.map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="w-full rounded-md border border-slate-850 bg-slate-950/50 p-3 text-sm text-slate-400 min-h-[44px] flex items-center">
              Cabang: {branchMap[currentUser?.branch_id ?? 0] || 'Memuat...'}
            </div>
          )}

          {/* Category Filter */}
          <select
            value={categoryId || 0}
            onChange={(e) => {
              const val = Number(e.target.value);
              setCategoryId(val || null);
              setPage(1);
            }}
            className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-white focus:border-amber-500 focus:outline-none min-h-[44px]"
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
            className="w-full rounded-md border border-slate-800 bg-slate-950 p-2 text-sm text-white focus:border-amber-500 focus:outline-none min-h-[44px]"
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
          <label className="inline-flex items-center gap-2 text-sm text-slate-300 cursor-pointer select-none min-h-[44px]">
            <input
              type="checkbox"
              checked={lowStockOnly}
              onChange={(e) => {
                setLowStockOnly(e.target.checked);
                setPage(1);
              }}
              className="h-4 w-4 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-slate-900"
            />
            Tampilkan Stok Menipis Saja
          </label>

          {hasActiveFilters && (
            <Button
              variant="ghost"
              onClick={handleResetFilters}
              className="text-slate-400 hover:text-white hover:bg-slate-800 min-h-[44px] px-4"
            >
              Reset Filter
            </Button>
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
          {/* Mobile Card List View */}
          <div className="grid grid-cols-1 gap-4 md:hidden">
            {stocksResponse?.data.map((stock) => {
              const image = itemImageMap[stock.item_id];
              return (
                <div
                  key={`${stock.branch_id}-${stock.item_id}`}
                  className="bg-slate-900 border border-slate-800 rounded-lg p-4 flex gap-4 items-start relative shadow-md"
                >
                  {/* Thumbnail Image */}
                  <div className="h-16 w-16 rounded overflow-hidden bg-slate-950 border border-slate-850 flex items-center justify-center flex-shrink-0">
                    {image ? (
                      <img src={image} alt={stock.item_name} className="h-full w-full object-cover" />
                    ) : (
                      <ImageIcon className="h-6 w-6 text-slate-700" />
                    )}
                  </div>

                  {/* Stock Details */}
                  <div className="flex-1 min-w-0">
                    <span className="font-mono text-xs font-bold text-amber-500 tracking-wide block mb-1">
                      {stock.item_code}
                    </span>
                    <h4 className="text-sm font-semibold text-white truncate mb-1">{stock.item_name}</h4>
                    
                    {isSuperAdmin && (
                      <p className="text-xs text-slate-400 mb-1">
                        Cabang: <span className="text-slate-300 font-medium">{branchMap[stock.branch_id] || '-'}</span>
                      </p>
                    )}
                    
                    <p className="text-xs text-slate-400 mb-1">
                      Kategori: <span className="text-slate-300 font-medium">{stock.category_name || '-'}</span>
                    </p>
                    <p className="text-xs text-slate-400 mb-2.5">
                      Merk/Supplier: <span className="text-slate-300 font-medium">{stock.supplier_name || '-'}</span>
                    </p>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-805">
                      <div className="text-xs text-slate-400">
                        Stok: <span className="text-sm font-bold text-white">{stock.quantity} {stock.uom_name || 'PCS'}</span>
                        <span className="text-[10px] text-slate-500 ml-1.5">(Min: {stock.minimum_stock})</span>
                      </div>
                      {renderStatusBadge(stock)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden md:block rounded-md border border-slate-800 bg-slate-900 overflow-hidden shadow-md">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 border-b border-slate-800">
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Foto</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kode Barang</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Nama Barang</th>
                  {isSuperAdmin && (
                    <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Cabang</th>
                  )}
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Kategori</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider">Merk/Supplier</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Stok</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Min. Stok</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-center">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-400 uppercase tracking-wider text-right">Terakhir Update</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
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
                    <tr
                      key={`${stock.branch_id}-${stock.item_id}`}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="h-10 w-10 rounded overflow-hidden bg-slate-950 border border-slate-800 flex items-center justify-center">
                          {image ? (
                            <img src={image} alt={stock.item_name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-amber-500">{stock.item_code}</td>
                      <td className="py-3 px-4 text-white font-medium">{stock.item_name}</td>
                      {isSuperAdmin && (
                        <td className="py-3 px-4 text-slate-300">{branchMap[stock.branch_id] || '-'}</td>
                      )}
                      <td className="py-3 px-4 text-slate-300">{stock.category_name || '-'}</td>
                      <td className="py-3 px-4 text-slate-300">{stock.supplier_name || '-'}</td>
                      <td className="py-3 px-4 text-white font-bold text-right">
                        {stock.quantity} {stock.uom_name || 'PCS'}
                      </td>
                      <td className="py-3 px-4 text-slate-400 text-right">{stock.minimum_stock}</td>
                      <td className="py-3 px-4 text-center">{renderStatusBadge(stock)}</td>
                      <td className="py-3 px-4 text-slate-400 text-xs text-right">{formattedDate}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {stocksResponse && stocksResponse.total_pages > 1 && (
            <div className="flex items-center justify-between px-2 py-4 border-t border-slate-900">
              <span className="text-xs text-slate-400">
                Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, stocksResponse.total)} dari {stocksResponse.total} item
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(p - 1, 1))}
                  className="border-slate-850 hover:bg-slate-900 text-white min-h-[36px]"
                >
                  Sebelumnya
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === stocksResponse.total_pages}
                  onClick={() => setPage((p) => Math.min(p + 1, stocksResponse.total_pages))}
                  className="border-slate-850 hover:bg-slate-900 text-white min-h-[36px]"
                >
                  Selanjutnya
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
