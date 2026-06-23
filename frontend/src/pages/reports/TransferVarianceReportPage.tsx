import { useState } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { useTransferVarianceReport, ReportFilters, TransferVarianceReportRow } from '../../hooks/useReports';
import { PageHeader } from '../../components/ui/PageHeader';
import { ReportFilterBar } from '../../components/reports/ReportFilterBar';
import { ReportExportButtons } from '../../components/reports/ReportExportButtons';
import { ReportTable, ReportColumn } from '../../components/reports/ReportTable';
import { Button } from '../../components/ui/button';
import { motion } from 'framer-motion';
import { EmptyState } from '../../components/ui/EmptyState';
import { Calendar, AlertTriangle, ArrowRight, ClipboardCheck } from 'lucide-react';

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

export function TransferVarianceReportPage() {
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
  const pageSize = 20;

  const [filters, setFilters] = useState<ReportFilters>(() => {
    const initialFilters = {
      branch_id: user?.role === 'super_admin' ? null : user?.branch_id,
      start_date: null,
      end_date: null,
      search: '',
      page: 1,
      page_size: pageSize
    };
    return loadPersistedFilters('transfer-variance', initialFilters);
  });

  // Query transfer variance report
  const { data, isLoading } = useTransferVarianceReport({ ...filters, page });

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const columns: ReportColumn<TransferVarianceReportRow>[] = [
    {
      header: 'No Transfer',
      cell: (r) => <span className="font-mono text-amber-500 font-bold">{r.transfer_number}</span>
    },
    {
      header: 'Rute',
      cell: (r) => (
        <div className="flex items-center gap-1 text-xs">
          <span>{r.source_branch_name}</span>
          <ArrowRight className="h-3 w-3 text-amber-500 flex-shrink-0" />
          <span>{r.dest_branch_name}</span>
        </div>
      )
    },
    {
      header: 'Tanggal Terima',
      cell: (r) => (
        <span className="flex items-center gap-1 text-slate-350 text-xs whitespace-nowrap">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          {formatDate(r.received_at)}
        </span>
      )
    },
    {
      header: 'Kode',
      cell: (r) => <span className="font-mono text-amber-500 font-bold">{r.item_code}</span>
    },
    { header: 'Nama Barang', accessorKey: 'item_name' },
    {
      header: 'Dikirim',
      align: 'right',
      cell: (r) => <span className="font-mono text-slate-400">{r.sent_quantity} pcs</span>
    },
    {
      header: 'Diterima',
      align: 'right',
      cell: (r) => <span className="font-mono font-bold text-white">{r.received_quantity} pcs</span>
    },
    {
      header: 'Selisih',
      align: 'right',
      cell: (r) => (
        <span className={`font-mono font-bold ${r.variance === 0 ? 'text-slate-400' : 'text-red-500'}`}>
          {r.variance > 0 ? `+${r.variance}` : r.variance} pcs
        </span>
      )
    },
    {
      header: 'Alasan & Catatan',
      cell: (r) => (
        <div className="space-y-0.5 max-w-[150px]">
          {r.variance_reason && (
            <span className="inline-block text-[10px] font-semibold bg-red-500/10 border border-red-500/20 text-red-400 px-1.5 py-0.2 rounded">
              {r.variance_reason}
            </span>
          )}
          {r.variance_notes && (
            <p className="text-[11px] text-slate-400 truncate" title={r.variance_notes}>{r.variance_notes}</p>
          )}
          {!r.variance_reason && !r.variance_notes && <span>-</span>}
        </div>
      )
    },
    { header: 'Penerima', accessorKey: 'receiver_name' }
  ];

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Selisih Mutasi Barang"
          description="Pantau laporan audit barang hilang atau rusak selama transit pengiriman antarcabang."
        />
        {data && data.items.length > 0 && (
          <ReportExportButtons
            endpoint="/reports/transfer-variance"
            filename="laporan_selisih_transfer"
            filters={filters}
          />
        )}
      </div>

      {/* Summary Cards */}
      {data?.summary && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-lg text-amber-500">
              <ClipboardCheck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Total Mutasi</p>
              <h4 className="text-xl font-bold text-white font-mono mt-0.5">{data.summary.total_transfers} Transaksi</h4>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg flex items-center gap-4">
            <div className="p-3 bg-red-500/10 rounded-lg text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Mutasi Berselisih</p>
              <h4 className="text-xl font-bold text-white font-mono mt-0.5">{data.summary.transfers_with_variance} Item</h4>
            </div>
          </div>

          <div className="bg-card border border-border rounded-xl p-5 shadow-lg flex items-center gap-4">
            <div className="p-3 bg-red-550/10 rounded-lg text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Unit Hilang / Rusak</p>
              <h4 className="text-xl font-bold text-white font-mono mt-0.5">{data.summary.total_lost_units} Pcs</h4>
            </div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <ReportFilterBar
        reportType="transfer-variance"
        filters={filters}
        onChange={handleFilterChange}
        showBranch={true}
        showCategory={false}
        showSupplier={false}
        showSearch={true}
        showDateRange={true}
        searchPlaceholder="Cari no transfer, kode/nama barang..."
      />

      {/* Data Table */}
      <ReportTable
        data={data?.items || []}
        columns={columns}
        keyExtractor={(r) => `${r.transfer_number}-${r.item_code}`}
        isLoading={isLoading}
        emptyMessage="Sempurna! Tidak ada selisih mutasi yang terdeteksi dalam periode ini."
      />

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex justify-between items-center px-2 py-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} dari {data.total} item selisih
          </span>
          <div className="flex gap-2">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="rounded-lg border-slate-800 hover:bg-slate-800 text-white min-h-[38px] px-3"
              >
                Sebelumnya
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="rounded-lg border-slate-800 hover:bg-slate-800 text-white min-h-[38px] px-3"
              >
                Selanjutnya
              </Button>
            </motion.div>
          </div>
        </div>
      )}
    </div>
  );
}
