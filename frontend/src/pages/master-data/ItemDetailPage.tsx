import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useItem } from '../../hooks/useItems';
import { useBranches } from '../../hooks/useBranches';
import { useBranchStocks } from '../../hooks/useBranchStocks';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  History, 
  Layers, 
  Truck, 
  Ruler, 
  AlertTriangle, 
  Image as ImageIcon, 
  Info,
  CheckCircle2
} from 'lucide-react';

export function ItemDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const currentUser = useAuthStore((state) => state.user);

  const itemId = Number(id);
  const { data: item, isLoading: isLoadingItem, error: itemError } = useItem(itemId);
  const { data: branches, isLoading: isLoadingBranches } = useBranches();
  
  // Fetch branch stocks using the unique item code to filter
  const { data: branchStocksData, isLoading: isLoadingStocks } = useBranchStocks({
    search: item?.item_code || '',
    page_size: 100, // retrieve all branches
  });

  const isLoading = isLoadingItem || isLoadingBranches || isLoadingStocks;

  if (isLoading) return <LoadingState />;
  
  if (itemError || !item) {
    return (
      <EmptyState
        title="Barang tidak ditemukan"
        description="Komponen barang yang Anda cari tidak terdaftar atau telah dihapus."
      />
    );
  }

  // Filter stocks matching exactly the item's item_code
  const itemStocks = branchStocksData?.data.filter(bs => bs.item_code === item.item_code) || [];

  // Determine authorized view: Super Admin can see all active branches, others only their assigned branch
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const visibleBranches = branches?.filter(b => b.is_active && (isSuperAdmin || b.branch_id === currentUser?.branch_id)) || [];

  const getBranchQuantity = (branchId: number) => {
    const stockRecord = itemStocks.find(s => s.branch_id === branchId);
    return stockRecord ? stockRecord.quantity : 0;
  };

  const isStaff = currentUser?.role === 'warehouse_staff';

  return (
    <div className="space-y-6">
      {/* Header & Back Button */}
      <div className="flex items-center gap-3">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/master-data/items')}
            className="text-slate-400 hover:text-white rounded-lg h-10 w-10 border border-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="sr-only">Kembali ke katalog</span>
          </Button>
        </motion.div>
        <PageHeader
          title="Detail Barang"
          description="Informasi lengkap atribut barang dan ketersediaan stok cabang."
        />
      </div>

      {/* Main Grid Layout - Bento Box Concept */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Profile Card */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-6">
            
            {/* Visual Header / Image & Code */}
            <div className="flex flex-col sm:flex-row gap-5 items-start sm:items-center border-b border-slate-800 pb-5">
              <div className="h-24 w-24 rounded-xl overflow-hidden bg-background border border-slate-850 flex items-center justify-center flex-shrink-0 shadow-inner">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon className="h-10 w-10 text-slate-650" />
                )}
              </div>
              <div className="space-y-1">
                <span className="font-mono text-sm font-bold text-amber-500 tracking-wider bg-amber-500/5 border border-amber-500/10 px-2.5 py-1 rounded-md">
                  {item.item_code}
                </span>
                <h2 className="text-xl font-bold text-white leading-snug mt-2">{item.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${
                    item.is_active 
                      ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' 
                      : 'bg-slate-800 text-slate-500 border-slate-750'
                  }`}>
                    {item.is_active ? 'Aktif' : 'Non-aktif'}
                  </span>
                </div>
              </div>
            </div>

            {/* Core Attributes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                <Layers className="h-5 w-5 text-amber-500/80" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Kategori</span>
                  <p className="text-sm font-semibold text-slate-200">{item.category?.name || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                <Truck className="h-5 w-5 text-amber-500/80" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Merk / Supplier</span>
                  <p className="text-sm font-semibold text-slate-200">{item.supplier?.name || '-'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                <Ruler className="h-5 w-5 text-amber-500/80" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Satuan (UOM)</span>
                  <p className="text-sm font-semibold text-slate-200">{item.uom?.name || 'PCS'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 bg-slate-900/40 p-3 rounded-lg border border-slate-850">
                <AlertTriangle className="h-5 w-5 text-amber-500/80" />
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Stok Minimum</span>
                  <p className="text-sm font-semibold text-slate-200">{item.minimum_stock} PCS</p>
                </div>
              </div>
            </div>

            {/* Description Box */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Info className="h-4 w-4 text-slate-500" /> Deskripsi Barang
              </h4>
              <div className="bg-slate-900/30 border border-slate-850 rounded-lg p-4 min-h-[80px] text-sm text-slate-300 leading-relaxed">
                {item.description || 'Tidak ada deskripsi tambahan untuk barang ini.'}
              </div>
            </div>

          </div>
        </div>

        {/* Right Side: Stock Distribution */}
        <div className="space-y-6">
          
          {/* Branch Stocks Card */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <div className="border-b border-slate-800 pb-3 flex justify-between items-center">
              <h3 className="font-semibold text-lg text-white">Stok di Gudang</h3>
              <span className="text-xs text-slate-400">
                {isSuperAdmin ? 'Semua Cabang' : 'Cabang Anda'}
              </span>
            </div>

            <div className="space-y-3">
              {visibleBranches.length === 0 ? (
                <div className="text-center py-6 text-slate-500 text-sm">
                  Tidak ada data gudang cabang yang tersedia.
                </div>
              ) : (
                visibleBranches.map((branch) => {
                  const qty = getBranchQuantity(branch.branch_id);
                  const isLow = qty <= item.minimum_stock;
                  
                  return (
                    <div 
                      key={branch.branch_id} 
                      className={`flex items-center justify-between p-4 rounded-lg border bg-slate-900/30 shadow-sm transition-all ${
                        isLow 
                          ? 'border-red-500/20 bg-red-500/5' 
                          : 'border-slate-850'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="text-sm font-bold text-white truncate">{branch.name}</p>
                        <p className="text-[10px] text-slate-500 font-medium truncate mt-0.5">{branch.location || '-'}</p>
                      </div>
                      
                      <div className="flex flex-col items-end flex-shrink-0">
                        <span className="font-mono text-base font-bold text-white">
                          {qty} <span className="text-xs font-normal text-slate-400">{item.uom?.name || 'PCS'}</span>
                        </span>
                        
                        {isLow ? (
                          <span className="text-[10px] font-semibold text-red-400 flex items-center gap-1 mt-1 bg-red-500/10 border border-red-500/20 px-1.5 py-0.5 rounded">
                            <AlertTriangle className="h-3 w-3" /> Stok Rendah
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 mt-1 bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 rounded">
                            <CheckCircle2 className="h-3 w-3" /> Cukup
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Action History Button - restricted to Super Admin and Branch Head */}
          {!isStaff && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-3">
              <h4 className="text-sm font-semibold text-slate-350">Laporan Transaksi</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                Lihat mutasi masuk-keluar secara mendalam pada kartu riwayat stok barang ini.
              </p>
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={() => navigate(`/reports/item-history/${item.item_id}`)}
                  className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 border-0 text-white font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                >
                  <History className="h-4 w-4" />
                  Lihat Riwayat Stok
                </Button>
              </motion.div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
