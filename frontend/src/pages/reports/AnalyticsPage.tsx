import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { useCategories } from '../../hooks/useCategories';
import { useSuppliers } from '../../hooks/useSuppliers';
import {
  useMovementVelocity,
  useActivityTrends,
  useDistributions,
  useTopOperators,
  useMovementClassification,
} from '../../hooks/useAnalytics';
import { PageHeader } from '../../components/ui/PageHeader';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaginationControl } from '../../components/ui/PaginationControl';
import { Button } from '../../components/ui/button';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  Cell,
  PieChart,
  Pie,
} from 'recharts';
import {
  Search,
  RotateCcw,
  AlertTriangle,
  Info,
} from 'lucide-react';

// Chart Colors
const CHART_PALETTE = ['#f59e0b', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f43f5e'];

export function AnalyticsPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();

  // Guard for role permission (Super Admin or Branch Head only)
  const canAccess = user?.role === 'super_admin' || user?.role === 'branch_head';

  const [days, setDays] = useState<number>(30);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(() => {
    return user?.role === 'super_admin' ? null : (user?.branch_id || null);
  });

  // Master Data hooks
  const { data: branches } = useBranches();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();

  // Classification filters & pagination
  const [classPage, setClassPage] = useState(1);
  const [classPageSize] = useState(10);
  const [classCategory, setClassCategory] = useState<number | null>(null);
  const [classSupplier, setClassSupplier] = useState<number | null>(null);
  const [classSearch, setClassSearch] = useState('');
  const [classDebouncedSearch, setClassDebouncedSearch] = useState('');

  const classificationRef = useRef<HTMLDivElement>(null);

  const handleClassPageChange = (p: number) => {
    setClassPage(p);
    classificationRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Debounce classification search
  useEffect(() => {
    const handler = setTimeout(() => {
      setClassDebouncedSearch(classSearch);
      setClassPage(1);
    }, 400);
    return () => clearTimeout(handler);
  }, [classSearch]);

  // Analytics queries
  const { data: velocityRes, isLoading: loadingVelocity } = useMovementVelocity(selectedBranchId, days);
  const { data: trendsRes, isLoading: loadingTrends } = useActivityTrends(selectedBranchId, days);
  const { data: distributionsRes, isLoading: loadingDistributions } = useDistributions(selectedBranchId);
  const { data: operatorsRes, isLoading: loadingOperators } = useTopOperators(selectedBranchId, days);
  const { data: classificationRes, isLoading: loadingClassification } = useMovementClassification(selectedBranchId, {
    category_id: classCategory,
    supplier_id: classSupplier,
    search: classDebouncedSearch,
    page: classPage,
    page_size: classPageSize,
  });

  if (!canAccess) {
    return (
      <EmptyState
        title="Akses Ditolak"
        description="Anda tidak memiliki wewenang untuk mengakses modul analitik ini."
      />
    );
  }

  const handleBranchChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedBranchId(val ? Number(val) : null);
    setClassPage(1);
  };

  const handleDaysChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setDays(Number(e.target.value));
  };

  const handleResetFilters = () => {
    setClassCategory(null);
    setClassSupplier(null);
    setClassSearch('');
    setClassPage(1);
  };

  // Helper to format ISO datetime to local string
  const formatGeneratedAt = (isoStr?: string) => {
    if (!isoStr) return '-';
    const d = new Date(isoStr);
    return d.toLocaleDateString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  };

  // Movement Classification Color/Label Mapping
  const getClassification = (days: number | null) => {
    if (days === null) {
      return { label: 'Dead Stock (Never)', bg: 'bg-red-500/10 text-red-400 border-red-500/20' };
    }
    if (days <= 60) {
      return { label: `Aktif (${days} hari)`, bg: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' };
    }
    if (days <= 180) {
      return { label: `Slow Moving (${days} hari)`, bg: 'bg-amber-500/10 text-amber-400 border-amber-500/20' };
    }
    return { label: `Dead Stock (${days} hari)`, bg: 'bg-red-500/10 text-red-400 border-red-500/20' };
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <PageHeader
          title="Analitik Gudang"
          description="Visualisasi logistik, kecepatan komponen, dan klasifikasi dead stock."
        />

        {/* Global Controls */}
        <div className="flex flex-wrap items-center gap-3 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
          {/* Branch Select (Super Admin Only) */}
          {isSuperAdmin && (
            <div className="flex items-center gap-2">
              <label htmlFor="global-branch" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cabang:</label>
              <select
                id="global-branch"
                value={selectedBranchId || ''}
                onChange={handleBranchChange}
                className="h-9 px-3 py-1 bg-slate-950 border border-slate-850 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">Semua Cabang</option>
                {branches?.filter((b) => b.is_active).map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Timeframe selector */}
          <div className="flex items-center gap-2">
            <label htmlFor="global-days" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Waktu:</label>
            <select
              id="global-days"
              value={days}
              onChange={handleDaysChange}
              className="h-9 px-3 py-1 bg-slate-950 border border-slate-850 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value={7}>7 Hari Terakhir</option>
              <option value={15}>15 Hari Terakhir</option>
              <option value={30}>30 Hari Terakhir</option>
              <option value={90}>90 Hari Terakhir</option>
              <option value={365}>1 Tahun Terakhir</option>
            </select>
          </div>
        </div>
      </div>

      {/* Grid of Analytics Layout */}
      <div className="space-y-6">

        {/* 1. Activity Trends Widget */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-lg text-white">Tren Aktivitas Gudang</h3>
              <p className="text-xs text-slate-400 mt-0.5">Volume logistik harian (Stok Masuk, Stok Keluar, dan Mutasi Cabang)</p>
            </div>
            {trendsRes && (
              <span className="text-[10px] text-slate-500 font-mono">
                Diperbarui: {formatGeneratedAt(trendsRes.generated_at)}
              </span>
            )}
          </div>

          {loadingTrends ? (
            <div className="h-72 flex items-center justify-center"><LoadingState /></div>
          ) : trendsRes && trendsRes.data.length > 0 ? (
            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendsRes.data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorInbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorOutbound" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f43f5e" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#f43f5e" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorTransfers" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                  <XAxis dataKey="date" stroke="#64748b" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748b" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                    labelStyle={{ color: '#fff', fontWeight: 'bold' }}
                  />
                  <Legend verticalAlign="top" height={36} wrapperStyle={{ fontSize: 12 }} />
                  <Area type="monotone" dataKey="inbound" stroke="#10b981" fillOpacity={1} fill="url(#colorInbound)" name="Stok Masuk" />
                  <Area type="monotone" dataKey="outbound" stroke="#f43f5e" fillOpacity={1} fill="url(#colorOutbound)" name="Stok Keluar" />
                  <Area type="monotone" dataKey="transfers" stroke="#3b82f6" fillOpacity={1} fill="url(#colorTransfers)" name="Mutasi Antar-Cabang" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-72 flex items-center justify-center text-slate-500">Tidak ada riwayat transaksi dalam jangka waktu ini.</div>
          )}
        </div>

        {/* Two Column Grid for Velocity + Distributions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* 2. Movement Velocity Widget */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-lg text-white">Kecepatan Aliran Komponen</h3>
                <p className="text-xs text-slate-400 mt-0.5">Top 10 Komponen dengan pengeluaran unit tercepat (pcs/hari)</p>
              </div>
              {velocityRes && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Diperbarui: {formatGeneratedAt(velocityRes.generated_at)}
                </span>
              )}
            </div>

            {loadingVelocity ? (
              <div className="h-72 flex items-center justify-center"><LoadingState /></div>
            ) : velocityRes && velocityRes.data.length > 0 ? (
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityRes.data} layout="vertical" margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" horizontal={false} />
                    <XAxis type="number" stroke="#64748b" fontSize={11} tickLine={false} />
                    <YAxis type="category" dataKey="item_name" stroke="#64748b" fontSize={10} width={100} tickLine={false} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                      formatter={(value: any) => [`${value} pcs/hari`, 'Laju Aliran']}
                    />
                    <Bar
                      dataKey="velocity"
                      fill="#f59e0b"
                      radius={[0, 4, 4, 0]}
                      onClick={(data: any) => {
                        if (data && data.item_id) {
                          navigate(`/master-data/items/${data.item_id}`);
                        }
                      }}
                      className="cursor-pointer"
                    >
                      {velocityRes.data.map((_entry, index) => (
                        <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">Tidak ada pengeluaran komponen yang tercatat.</div>
            )}
          </div>

          {/* 3 & 4. Category & Branch Distributions */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-semibold text-lg text-white">Distribusi Volume Stok</h3>
                <p className="text-xs text-slate-400 mt-0.5">Proporsi total unit fisik di gudang saat ini</p>
              </div>
              {distributionsRes && (
                <span className="text-[10px] text-slate-500 font-mono">
                  Diperbarui: {formatGeneratedAt(distributionsRes.generated_at)}
                </span>
              )}
            </div>

            {loadingDistributions ? (
              <div className="h-72 flex items-center justify-center"><LoadingState /></div>
            ) : distributionsRes ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 h-72">
                {/* Category Donut */}
                <div className="flex flex-col items-center justify-center relative">
                  <span className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Kategori Barang</span>
                  <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={distributionsRes.categories}
                          dataKey="total_quantity"
                          nameKey="category_name"
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={2}
                          onClick={(data: any) => {
                            const cid = data?.payload?.category_id || data?.category_id;
                            if (cid) navigate(`/reports/stock?category_id=${cid}`);
                          }}
                          className="cursor-pointer"
                        >
                          {distributionsRes.categories.map((_entry, index) => (
                            <Cell key={`cell-${index}`} fill={CHART_PALETTE[index % CHART_PALETTE.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                          formatter={(value: any, name: any, props: any) => [`${value} pcs (${props.payload.item_count} item)`, name]}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="text-[10px] text-slate-500 text-center mt-1">Klik slice untuk drill-down laporan</div>
                </div>

                {/* Branch Pie (Super Admin Only) */}
                {isSuperAdmin && distributionsRes.branches ? (
                  <div className="flex flex-col items-center justify-center relative border-l border-slate-800/60">
                    <span className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">Penyebaran Cabang</span>
                    <div className="h-48 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={distributionsRes.branches}
                            dataKey="total_quantity"
                            nameKey="branch_name"
                            cx="50%"
                            cy="50%"
                            innerRadius={50}
                            outerRadius={70}
                            paddingAngle={2}
                            onClick={(data: any) => {
                              const bid = data?.payload?.branch_id || data?.branch_id;
                              if (bid) navigate(`/reports/stock?branch_id=${bid}`);
                            }}
                            className="cursor-pointer"
                          >
                            {distributionsRes.branches.map((_entry, index) => (
                              <Cell key={`cell-${index}`} fill={CHART_PALETTE[(index + 3) % CHART_PALETTE.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#1e293b', borderRadius: '8px' }}
                            formatter={(value: any, name: any, props: any) => [`${value} pcs (${props.payload.item_count} item)`, name]}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                    <div className="text-[10px] text-slate-500 text-center mt-1">Klik slice untuk drill-down laporan</div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center border-l border-slate-800/60 text-slate-500 text-xs p-6 text-center">
                    <Info className="h-8 w-8 text-slate-600 mb-2" />
                    Penyebaran Cabang hanya dapat diakses oleh peran Super Admin.
                  </div>
                )}
              </div>
            ) : (
              <div className="h-72 flex items-center justify-center text-slate-500">Gagal memuat distribusi volume stok.</div>
            )}
          </div>

        </div>

        {/* 5. Top Operators Widget */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex justify-between items-center border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-lg text-white">Leaderboard Operator Teraktif</h3>
              <p className="text-xs text-slate-400 mt-0.5">Warehouse staff berdasarkan volume logistik transaksi (tidak termasuk penyesuaian opname)</p>
            </div>
            {operatorsRes && (
              <span className="text-[10px] text-slate-500 font-mono">
                Diperbarui: {formatGeneratedAt(operatorsRes.generated_at)}
              </span>
            )}
          </div>

          {loadingOperators ? (
            <div className="py-8 flex items-center justify-center"><LoadingState /></div>
          ) : operatorsRes && operatorsRes.data.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {operatorsRes.data.slice(0, 5).map((op, idx) => (
                <div key={op.user_id} className="flex items-center justify-between p-3.5 bg-slate-900/40 rounded-xl border border-slate-850">
                  <div className="flex items-center gap-3">
                    <span className={`h-7 w-7 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                      idx === 0 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                      idx === 1 ? 'bg-slate-400/20 text-slate-350 border border-slate-400/30' :
                      idx === 2 ? 'bg-orange-850/20 text-orange-400 border border-orange-500/30' :
                      'bg-slate-800 text-slate-400'
                    }`}>
                      {idx + 1}
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{op.operator_name}</p>
                      <p className="text-xs text-slate-500">User ID #{op.user_id}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-white">{op.total_transactions} Transaksi</p>
                    <p className="text-xs text-slate-400">{op.total_units} unit diproses</p>
                  </div>
                </div>
              ))}
              {operatorsRes.data.length === 0 && (
                <div className="col-span-2 text-center text-slate-500 py-6">Belum ada aktivitas operator yang tercatat.</div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-8">Belum ada data aktivitas operator.</div>
          )}
        </div>

        {/* 6. Movement Classification Widget */}
        <div ref={classificationRef} className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <div>
              <h3 className="font-semibold text-lg text-white">Analisis Usia &amp; Klasifikasi Perputaran</h3>
              <p className="text-xs text-slate-400 mt-0.5">Daftar lengkap seluruh komponen aktif untuk audit dead stock (stok mati)</p>
            </div>
            {classificationRes && (
              <span className="text-[10px] text-slate-500 font-mono">
                Diperbarui: {formatGeneratedAt(classificationRes.generated_at)}
              </span>
            )}
          </div>

          {/* Classification Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-950 p-3 rounded-lg border border-slate-850/80">
            {/* Search Input */}
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={classSearch}
                onChange={(e) => setClassSearch(e.target.value)}
                placeholder="Cari item..."
                className="w-full h-9 pl-9 pr-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>

            {/* Category Select */}
            <select
              value={classCategory || ''}
              onChange={(e) => {
                setClassCategory(e.target.value ? Number(e.target.value) : null);
                setClassPage(1);
              }}
              className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Kategori</option>
              {categories?.filter(c => c.is_active).map(c => (
                <option key={c.category_id} value={c.category_id}>{c.name}</option>
              ))}
            </select>

            {/* Supplier Select */}
            <select
              value={classSupplier || ''}
              onChange={(e) => {
                setClassSupplier(e.target.value ? Number(e.target.value) : null);
                setClassPage(1);
              }}
              className="h-9 px-3 bg-slate-900 border border-slate-800 rounded-lg text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">Semua Supplier/Brand</option>
              {suppliers?.filter(s => s.is_active).map(s => (
                <option key={s.supplier_id} value={s.supplier_id}>{s.name}</option>
              ))}
            </select>
          </div>

          {loadingClassification ? (
            <div className="py-12 flex items-center justify-center"><LoadingState /></div>
          ) : classificationRes && classificationRes.data.length > 0 ? (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                      <th className="py-3 px-4">Kode</th>
                      <th className="py-3 px-4">Nama Barang</th>
                      <th className="py-3 px-4">Kategori</th>
                      <th className="py-3 px-4">Supplier</th>
                      <th className="py-3 px-4">Mutasi Terakhir</th>
                      <th className="py-3 px-4 text-right">Klasifikasi Keaktifan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classificationRes.data.map((item) => {
                      const cls = getClassification(item.days_since_last_movement);
                      return (
                        <tr key={item.item_id} className="border-b border-slate-850 hover:bg-slate-900/20">
                          <td className="py-3 px-4 font-mono font-bold text-amber-500">
                            <button
                              type="button"
                              onClick={() => navigate(`/master-data/items/${item.item_id}`)}
                              className="hover:underline focus:outline-none text-left"
                            >
                              {item.item_code}
                            </button>
                          </td>
                          <td className="py-3 px-4 font-medium text-white">{item.item_name}</td>
                          <td className="py-3 px-4 text-slate-350">{item.category_name}</td>
                          <td className="py-3 px-4 text-slate-350">{item.supplier_name}</td>
                          <td className="py-3 px-4 text-slate-400">
                            {item.last_movement_date ? (
                              new Date(item.last_movement_date).toLocaleDateString('id-ID', {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                              })
                            ) : (
                              <span className="text-slate-600 italic">Never Moved</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${cls.bg}`}>
                              {cls.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination control */}
              <PaginationControl
                currentPage={classPage}
                totalPages={Math.ceil(classificationRes.total / classPageSize)}
                totalItems={classificationRes.total}
                pageSize={classPageSize}
                onPageChange={handleClassPageChange}
                onPageSizeChange={() => {}}
                shouldScrollToTop={false}
              />
            </div>
          ) : (
            <div className="py-12 flex flex-col items-center justify-center text-center text-slate-500">
              <AlertTriangle className="h-8 w-8 text-slate-600 mb-2" />
              <p>Tidak ada komponen yang cocok dengan filter pencarian.</p>
              {(classCategory || classSupplier || classSearch) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleResetFilters}
                  className="mt-3 text-xs text-primary hover:text-white"
                >
                  <RotateCcw className="h-3.5 w-3.5 mr-1" /> Reset Filter
                </Button>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
