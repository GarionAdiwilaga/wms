import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Button } from '../../components/ui/button';
import { PaginationControl } from '../../components/ui/PaginationControl';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useItem } from '../../hooks/useItems';
import { useItemHistoryReport, ReportFilters, ItemHistoryReportRow } from '../../hooks/useReports';
import { PageHeader } from '../../components/ui/PageHeader';
import { ItemSearch } from '../../components/common/ItemSearch';
import { ReportFilterBar } from '../../components/reports/ReportFilterBar';
import { ReportExportButtons } from '../../components/reports/ReportExportButtons';
import { ReportTable, ReportColumn } from '../../components/reports/ReportTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { Calendar, User, Search, RefreshCw, FileText } from 'lucide-react';

const loadPersistedFilters = (reportType: string, defaultFilters: ReportFilters): ReportFilters => {
  try {
    const stored = localStorage.getItem(`wms_report_filter_${reportType}`);
    if (stored) {
      const parsed = JSON.parse(stored);
      return { ...defaultFilters, ...parsed };
    }
  } catch (e) {
    console.error(e);
  }
  return defaultFilters;
};

export function ItemHistoryReportPage() {
  const { itemId } = useParams<{ itemId?: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  // Guard for role permission
  const canAccess = user?.role === 'super_admin' || user?.role === 'branch_head';
  if (!canAccess) {
    return (
      <EmptyState
        title="Akses Ditolak"
        description="Anda tidak memiliki wewenang untuk mengakses modul laporan ini."
      />
    );
  }

  const routeItemId = itemId ? Number(itemId) : null;
  const [selectedItemId, setSelectedItemId] = useState<number | null>(routeItemId);

  // If routeParam changes, sync with state
  useEffect(() => {
    if (routeItemId !== null) {
      setSelectedItemId(routeItemId);
    }
  }, [routeItemId]);

  // Load item details if selected
  const { data: item, isLoading: isLoadingItem } = useItem(selectedItemId || 0);

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filters, setFilters] = useState<ReportFilters>(() => {
    const initialFilters = {
      branch_id: user?.role === 'super_admin' ? null : user?.branch_id,
      start_date: null,
      end_date: null,
      page: 1,
      page_size: pageSize
    };
    return loadPersistedFilters('item-history', initialFilters);
  });

  const { data, isLoading: isLoadingHistory } = useItemHistoryReport(selectedItemId, { ...filters, page });

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleItemSelect = (selectedItem: any) => {
    setSelectedItemId(selectedItem.item_id);
    setPage(1);
    navigate(`/reports/item-history/${selectedItem.item_id}`);
  };

  const handleClearItem = () => {
    setSelectedItemId(null);
    setPage(1);
    navigate('/reports/item-history');
  };

  const translateRefType = (refType: string) => {
    switch (refType) {
      case 'manual': return 'Koreksi Manual';
      case 'stock_in': return 'Stok Masuk';
      case 'outbound': return 'Barang Keluar';
      case 'transfer': return 'Mutasi Cabang';
      case 'opname': return 'Opname Stok';
      case 'system': return 'Penyesuaian Sistem';
      default: return refType;
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const columns: ReportColumn<ItemHistoryReportRow>[] = [
    {
      header: 'Waktu',
      cell: (r) => (
        <span className="flex items-center gap-1.5 font-medium whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          {formatDate(r.created_at)}
        </span>
      )
    },
    { header: 'Cabang', accessorKey: 'branch_name' },
    {
      header: 'Tipe',
      cell: (r) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
          r.transaction_type === 'IN' 
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
            : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {r.transaction_type === 'IN' ? 'Stok Masuk (IN)' : 'Stok Keluar (OUT)'}
        </span>
      )
    },
    {
      header: 'Jumlah',
      align: 'right',
      cell: (r) => <span className="font-mono font-bold">{r.quantity} pcs</span>
    },
    {
      header: 'Referensi',
      cell: (r) => (
        <div className="space-y-0.5">
          <span className="text-xs font-medium text-white">{translateRefType(r.reference_type)}</span>
          {r.document_no && (
            <span className="text-[10px] text-amber-500 font-mono block">{r.document_no}</span>
          )}
        </div>
      )
    },
    {
      header: 'Operator',
      cell: (r) => (
        <span className="flex items-center gap-1 text-slate-350 text-xs">
          <User className="h-3 w-3 text-slate-500" />
          {r.operator_name}
        </span>
      )
    },
    {
      header: 'Catatan',
      cell: (r) => <span className="text-slate-400 text-xs line-clamp-2 max-w-[200px]" title={r.notes || ''}>{r.notes || '-'}</span>
    }
  ];

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Riwayat Stok Barang"
          description="Lacak kartu stok kronologis transaksi per item barang."
        />
        {selectedItemId && data && data.data.length > 0 && (
          <ReportExportButtons
            endpoint={`/reports/item-history/${selectedItemId}`}
            filename={`riwayat_barang_${item?.item_code || selectedItemId}`}
            filters={filters}
          />
        )}
      </div>

      {/* Select Item Card */}
      {!selectedItemId ? (
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
          <h3 className="font-semibold text-base text-white flex items-center gap-2">
            <Search className="h-5 w-5 text-amber-500" />
            Pilih Barang untuk Dilihat Riwayatnya
          </h3>
          <ItemSearch onSelect={handleItemSelect} clearOnSelect={false} />
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-850 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 rounded-lg overflow-hidden bg-background border border-border flex items-center justify-center flex-shrink-0">
              {item?.image_url ? (
                <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
              ) : (
                <FileText className="h-6 w-6 text-slate-500" />
              )}
            </div>
            <div>
              <span className="font-mono text-xs font-bold text-amber-500 uppercase">{item?.item_code}</span>
              <h3 className="font-bold text-white text-base leading-tight">{item?.name || 'Memuat...'}</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Kategori: <span className="text-slate-200 font-medium">{item?.category?.name || '-'}</span> | Supplier: <span className="text-slate-200 font-medium">{item?.supplier?.name || '-'}</span>
              </p>
            </div>
          </div>
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearItem}
              className="border-slate-800 hover:bg-slate-800 text-slate-350 rounded-lg flex items-center gap-1.5 h-9"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Ganti Barang
            </Button>
          </motion.div>
        </div>
      )}

      {selectedItemId && (
        <>
          {/* Filter Bar */}
          <ReportFilterBar
            reportType="item-history"
            filters={filters}
            onChange={handleFilterChange}
            showBranch={true}
            showCategory={false}
            showSupplier={false}
            showSearch={false}
            showDateRange={true}
          />

          {/* Data Table */}
          <ReportTable
            data={data?.data || []}
            columns={columns}
            keyExtractor={(r) => r.transaction_id}
            isLoading={isLoadingHistory || isLoadingItem}
          />

          {/* Pagination */}
          {/* Pagination Controls */}
          {data && (
            <PaginationControl
              currentPage={page}
              totalPages={totalPages}
              totalItems={data.total}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </>
      )}
    </div>
  );
}
