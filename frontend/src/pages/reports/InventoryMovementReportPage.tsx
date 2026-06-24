import { useState } from 'react';
import { PaginationControl } from '../../components/ui/PaginationControl';
import { useAuthStore } from '../../store/auth-store';
import { useInventoryMovementReport, ReportFilters, InventoryMovementReportRow } from '../../hooks/useReports';
import { PageHeader } from '../../components/ui/PageHeader';
import { ReportFilterBar } from '../../components/reports/ReportFilterBar';
import { ReportExportButtons } from '../../components/reports/ReportExportButtons';
import { ReportTable, ReportColumn } from '../../components/reports/ReportTable';
import { EmptyState } from '../../components/ui/EmptyState';
import { Calendar, User } from 'lucide-react';

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

export function InventoryMovementReportPage() {
  const user = useAuthStore((state) => state.user);

  // Guard for role permission (Super Admin or Branch Head only)
  const canAccess = user?.role === 'super_admin' || user?.role === 'branch_head';
  if (!canAccess) {
    return (
      <EmptyState
        title="Akses Ditolak"
        description="Anda tidak memiliki wewenang untuk mengakses modul laporan ini."
      />
    );
  }

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const [filters, setFilters] = useState<ReportFilters>(() => {
    const initialFilters = {
      branch_id: user?.role === 'super_admin' ? null : user?.branch_id,
      category_id: null,
      supplier_id: null,
      start_date: null,
      end_date: null,
      search: '',
      page: 1,
      page_size: pageSize
    };
    return loadPersistedFilters('movements', initialFilters);
  });

  // Query inventory movements report
  const { data, isLoading } = useInventoryMovementReport({ ...filters, page });

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(1);
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

  const columns: ReportColumn<InventoryMovementReportRow>[] = [
    {
      header: 'Waktu',
      cell: (r) => (
        <span className="flex items-center gap-1.5 font-medium whitespace-nowrap text-xs">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          {formatDate(r.created_at)}
        </span>
      )
    },
    { header: 'Cabang', accessorKey: 'branch_name' },
    {
      header: 'Kode',
      cell: (r) => <span className="font-mono text-amber-500 font-bold">{r.item_code}</span>
    },
    { header: 'Nama Barang', accessorKey: 'item_name' },
    {
      header: 'Tipe',
      cell: (r) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
          r.transaction_type === 'IN' 
            ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' 
            : 'bg-red-500/10 text-red-500 border border-red-500/20'
        }`}>
          {r.transaction_type === 'IN' ? 'IN' : 'OUT'}
        </span>
      )
    },
    {
      header: 'Jumlah',
      align: 'right',
      cell: (r) => <span className="font-mono font-bold">{r.quantity} pcs</span>
    },
    {
      header: 'Saldo Akhir',
      align: 'right',
      cell: (r) => <span className="font-mono font-bold text-amber-500">{r.balance_after} pcs</span>
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
      cell: (r) => <span className="text-slate-400 text-xs line-clamp-1 max-w-[150px]" title={r.notes || ''}>{r.notes || '-'}</span>
    }
  ];

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Mutasi Stok Barang"
          description="Lihat data rincian pergerakan stok barang masuk dan keluar secara kronologis."
        />
        {data && data.data.length > 0 && (
          <ReportExportButtons
            endpoint="/reports/movements"
            filename="laporan_mutasi_stok"
            filters={filters}
          />
        )}
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        reportType="movements"
        filters={filters}
        onChange={handleFilterChange}
        showBranch={true}
        showCategory={true}
        showSupplier={true}
        showSearch={true}
        showDateRange={true}
        searchPlaceholder="Cari kode atau nama barang..."
      />

      {/* Data Table */}
      <ReportTable
        data={data?.data || []}
        columns={columns}
        keyExtractor={(r) => r.transaction_id}
        isLoading={isLoading}
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
    </div>
  );
}
