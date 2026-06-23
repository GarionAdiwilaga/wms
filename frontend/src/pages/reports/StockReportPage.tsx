import { useState } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { useStockReport, ReportFilters } from '../../hooks/useReports';
import { PageHeader } from '../../components/ui/PageHeader';
import { ReportFilterBar } from '../../components/reports/ReportFilterBar';
import { ReportExportButtons } from '../../components/reports/ReportExportButtons';
import { ReportTable, ReportColumn } from '../../components/reports/ReportTable';
import { Button } from '../../components/ui/button';
import { motion } from 'framer-motion';
import { EmptyState } from '../../components/ui/EmptyState';
import { StockReportRow } from '../../hooks/useReports';

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

export function StockReportPage() {
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
      category_id: null,
      supplier_id: null,
      search: '',
      page: 1,
      page_size: pageSize
    };
    return loadPersistedFilters('stock', initialFilters);
  });

  // Query stock report
  const { data, isLoading } = useStockReport({ ...filters, page });

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const columns: ReportColumn<StockReportRow>[] = [
    { header: 'Cabang', accessorKey: 'branch_name' },
    {
      header: 'Kode Barang',
      cell: (r) => <span className="font-mono text-amber-500 font-bold">{r.item_code}</span>
    },
    { header: 'Nama Barang', accessorKey: 'item_name' },
    { header: 'Kategori', accessorKey: 'category_name' },
    { header: 'Supplier', accessorKey: 'supplier_name' },
    {
      header: 'Stok',
      accessorKey: 'quantity',
      align: 'right',
      cell: (r) => <span className="font-mono font-bold">{r.quantity} pcs</span>
    },
    {
      header: 'Min Stok',
      accessorKey: 'minimum_stock',
      align: 'right',
      cell: (r) => <span className="font-mono text-slate-400">{r.minimum_stock} pcs</span>
    }
  ];

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Laporan Stok"
          description="Lihat data rincian stok komponen terkini di seluruh cabang."
        />
        {data && data.items.length > 0 && (
          <ReportExportButtons
            endpoint="/reports/stock"
            filename="laporan_stok"
            filters={filters}
          />
        )}
      </div>

      {/* Filter Bar */}
      <ReportFilterBar
        reportType="stock"
        filters={filters}
        onChange={handleFilterChange}
        showBranch={true}
        showCategory={true}
        showSupplier={true}
        showSearch={true}
        showDateRange={false}
        searchPlaceholder="Cari kode atau nama barang..."
      />

      {/* Data Table */}
      <ReportTable
        data={data?.items || []}
        columns={columns}
        keyExtractor={(r) => `${r.branch_name}-${r.item_code}`}
        isLoading={isLoading}
      />

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex justify-between items-center px-2 py-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} dari {data.total} item
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
