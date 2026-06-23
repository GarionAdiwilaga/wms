import React, { useState } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { useUsers } from '../../hooks/useUsers';
import { useAuditLogReport, ReportFilters, AuditLogReportRow } from '../../hooks/useReports';
import { PageHeader } from '../../components/ui/PageHeader';
import { ReportFilterBar } from '../../components/reports/ReportFilterBar';
import { ReportExportButtons } from '../../components/reports/ReportExportButtons';
import { ReportColumn } from '../../components/reports/ReportTable';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { motion } from 'framer-motion';
import { EmptyState } from '../../components/ui/EmptyState';
import { Calendar, User, Eye, EyeOff, Terminal } from 'lucide-react';

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

export function AuditLogReportPage() {
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

  const { data: users } = useUsers();
  
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const [filters, setFilters] = useState<ReportFilters>(() => {
    const initialFilters = {
      branch_id: user?.role === 'super_admin' ? null : user?.branch_id,
      user_id: null,
      action: '',
      entity_type: '',
      start_date: null,
      end_date: null,
      page: 1,
      page_size: pageSize
    };
    return loadPersistedFilters('audit-logs', initialFilters);
  });

  const [expandedLogIds, setExpandedLogIds] = useState<Set<number>>(new Set());

  // Query audit logs
  const { data, isLoading } = useAuditLogReport({ ...filters, page });

  const handleFilterChange = (newFilters: ReportFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const toggleRowExpansion = (logId: number) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(logId)) {
        next.delete(logId);
      } else {
        next.add(logId);
      }
      return next;
    });
  };

  const translateAction = (action: string) => {
    switch (action) {
      case 'create': return 'Tambah';
      case 'update': return 'Ubah';
      case 'delete': return 'Hapus';
      case 'stock_in': return 'Stok Masuk';
      case 'outbound': return 'Barang Keluar';
      case 'ship': return 'Kirim Mutasi';
      case 'receive': return 'Terima Mutasi';
      case 'cancel': return 'Batal Mutasi';
      case 'opname_complete': return 'Selesaikan Opname';
      default: return action;
    }
  };

  const translateEntityType = (entityType: string) => {
    switch (entityType) {
      case 'item': return 'Barang';
      case 'category': return 'Kategori';
      case 'supplier': return 'Supplier';
      case 'branch': return 'Cabang';
      case 'user': return 'User / Pengguna';
      case 'stock_in': return 'Transaksi Masuk';
      case 'outbound': return 'Transaksi Keluar';
      case 'transfer': return 'Mutasi Barang';
      case 'stock_opname': return 'Sesi Opname';
      default: return entityType;
    }
  };

  const getActionColor = (action: string) => {
    switch (action) {
      case 'create': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'update': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'delete': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      default: return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const columns: ReportColumn<AuditLogReportRow>[] = [
    {
      header: 'Waktu',
      cell: (r) => (
        <span className="flex items-center gap-1.5 font-medium whitespace-nowrap text-xs">
          <Calendar className="h-3.5 w-3.5 text-slate-500" />
          {formatDate(r.created_at)}
        </span>
      )
    },
    {
      header: 'Operator',
      cell: (r) => (
        <span className="flex items-center gap-1 text-xs">
          <User className="h-3.5 w-3.5 text-slate-500" />
          {r.operator_name}
        </span>
      )
    },
    {
      header: 'Aksi',
      cell: (r) => (
        <span className={`px-2 py-0.5 rounded text-xs font-semibold ${getActionColor(r.action)}`}>
          {translateAction(r.action)}
        </span>
      )
    },
    {
      header: 'Entitas',
      cell: (r) => (
        <div className="space-y-0.5">
          <span className="text-xs font-medium text-white">{translateEntityType(r.entity_type)}</span>
          <span className="text-[10px] text-slate-500 font-mono block">ID: {r.entity_id}</span>
        </div>
      )
    },
    {
      header: 'IP Address',
      cell: (r) => <span className="font-mono text-xs text-slate-400">{r.ip_address || '-'}</span>
    },
    {
      header: 'Detail Data',
      align: 'center',
      cell: (r) => {
        const hasValues = r.old_values || r.new_values;
        if (!hasValues) return <span className="text-xs text-slate-600">-</span>;
        
        const isExpanded = expandedLogIds.has(r.log_id);
        return (
          <motion.div whileTap={{ scale: 0.95 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleRowExpansion(r.log_id)}
              className="text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg flex items-center gap-1.5 h-8 px-2.5 mx-auto"
            >
              {isExpanded ? (
                <>
                  <EyeOff className="h-3.5 w-3.5" /> Sembunyikan
                </>
              ) : (
                <>
                  <Eye className="h-3.5 w-3.5" /> Lihat Perubahan
                </>
              )}
            </Button>
          </motion.div>
        );
      }
    }
  ];

  // Custom renderer for table with nested JSON details
  const renderAuditTable = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-12 text-slate-400">
          <LoaderSpinner />
        </div>
      );
    }

    if (!data || data.items.length === 0) {
      return (
        <div className="bg-card border border-border rounded-xl p-8 text-center text-slate-400 shadow-md">
          <p className="text-sm font-medium">Tidak ada audit log ditemukan.</p>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        {/* Mobile View with collapsible JSON inline */}
        <div className="grid grid-cols-1 gap-4 md:hidden">
          {data.items.map((r) => {
            const isExpanded = expandedLogIds.has(r.log_id);
            const hasValues = r.old_values || r.new_values;

            return (
              <div key={r.log_id} className="bg-card border border-border rounded-xl p-4 shadow-md space-y-3 hover:border-slate-800 transition-colors">
                <div className="flex justify-between border-b border-slate-850/50 pb-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Waktu</span>
                  <span className="text-xs text-white">{formatDate(r.created_at)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/50 pb-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Operator</span>
                  <span className="text-xs text-white">{r.operator_name}</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/50 pb-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Aksi</span>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${getActionColor(r.action)}`}>
                    {translateAction(r.action)}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-850/50 pb-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Entitas</span>
                  <span className="text-xs text-white">{translateEntityType(r.entity_type)} (ID: {r.entity_id})</span>
                </div>
                <div className="flex justify-between border-b border-slate-850/50 pb-2">
                  <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">IP Address</span>
                  <span className="text-xs text-slate-400 font-mono">{r.ip_address || '-'}</span>
                </div>

                {hasValues && (
                  <div className="pt-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleRowExpansion(r.log_id)}
                      className="text-xs text-amber-500 hover:text-amber-400 hover:bg-amber-500/10 rounded-lg flex items-center gap-1.5 h-8 w-full justify-center border border-slate-850"
                    >
                      {isExpanded ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" /> Sembunyikan Detail
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" /> Lihat Detail Perubahan
                        </>
                      )}
                    </Button>
                  </div>
                )}

                {isExpanded && hasValues && (
                  <div className="pt-2 space-y-3 border-t border-slate-800/60 mt-2">
                    {r.old_values && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Nilai Sebelum</span>
                        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] text-red-400 overflow-x-auto font-mono max-h-[150px] overflow-y-auto">
                          {JSON.stringify(r.old_values, null, 2)}
                        </pre>
                      </div>
                    )}
                    {r.new_values && (
                      <div className="space-y-1">
                        <span className="text-[10px] text-slate-550 font-bold uppercase tracking-wider">Nilai Sesudah</span>
                        <pre className="bg-slate-950 p-3 rounded-lg border border-slate-850 text-[10px] text-emerald-450 overflow-x-auto font-mono max-h-[150px] overflow-y-auto">
                          {JSON.stringify(r.new_values, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Desktop view with custom nested tr */}
        <div className="hidden md:block rounded-xl border border-border bg-card overflow-hidden shadow-lg">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse text-slate-350">
              <thead className="bg-slate-900/60 text-slate-300 font-semibold border-b border-slate-850">
                <tr>
                  {columns.map((col, idx) => (
                    <th key={idx} className="px-4 py-3.5 text-xs font-bold uppercase tracking-wider text-left">
                      {col.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-850">
                {data.items.map((r) => {
                  const isExpanded = expandedLogIds.has(r.log_id);
                  return (
                    <React.Fragment key={r.log_id}>
                      <tr className="hover:bg-slate-900/30 transition-colors">
                        {columns.map((col, idx) => {
                          const val = col.cell ? col.cell(r) : col.accessorKey ? (r[col.accessorKey as keyof AuditLogReportRow] as any) : null;
                          return (
                            <td key={idx} className="px-4 py-3.5">
                              <div className="text-white font-medium">{val}</div>
                            </td>
                          );
                        })}
                      </tr>

                      {/* Expandable row */}
                      {isExpanded && (r.old_values || r.new_values) && (
                        <tr className="bg-slate-950/40">
                          <td colSpan={columns.length} className="px-6 py-4 border-t border-slate-900">
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Terminal className="h-3 w-3" /> Nilai Sebelum Perubahan
                                </span>
                                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 text-xs text-red-400 overflow-x-auto font-mono max-h-[250px] overflow-y-auto leading-relaxed shadow-inner">
                                  {r.old_values ? JSON.stringify(r.old_values, null, 2) : '// Tidak ada data sebelumnya'}
                                </pre>
                              </div>
                              <div className="space-y-1">
                                <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider flex items-center gap-1">
                                  <Terminal className="h-3 w-3" /> Nilai Sesudah Perubahan
                                </span>
                                <pre className="bg-slate-950 p-4 rounded-xl border border-slate-850/80 text-xs text-emerald-450 overflow-x-auto font-mono max-h-[250px] overflow-y-auto leading-relaxed shadow-inner">
                                  {r.new_values ? JSON.stringify(r.new_values, null, 2) : '// Tidak ada perubahan nilai'}
                                </pre>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const totalPages = data ? Math.ceil(data.total / pageSize) : 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Log Audit Sistem"
          description="Pantau riwayat log aktivitas audit, perubahan database, dan mutasi data oleh pengguna."
        />
        {data && data.items.length > 0 && (
          <ReportExportButtons
            endpoint="/reports/audit-logs"
            filename="laporan_audit_log"
            filters={filters}
          />
        )}
      </div>

      {/* Filter Bar with nested custom Select selectors for Audit options */}
      <ReportFilterBar
        reportType="audit-logs"
        filters={filters}
        onChange={handleFilterChange}
        showBranch={true}
        showCategory={false}
        showSupplier={false}
        showSearch={false}
        showDateRange={true}
      />

      {/* Custom selectors specific to audit logging */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-md grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label htmlFor="audit-user" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Operator / Pengguna</Label>
          <select
            id="audit-user"
            name="audit_user"
            value={filters.user_id || ''}
            onChange={(e) => handleFilterChange({ ...filters, user_id: e.target.value ? Number(e.target.value) : null })}
            className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
          >
            <option value="">Semua Operator</option>
            {users?.map((u) => (
              <option key={u.user_id} value={u.user_id}>
                {u.full_name} ({u.username})
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="audit-action" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Aksi Aktivitas</Label>
          <select
            id="audit-action"
            name="audit_action"
            value={filters.action || ''}
            onChange={(e) => handleFilterChange({ ...filters, action: e.target.value || null })}
            className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
          >
            <option value="">Semua Aksi</option>
            <option value="create">Tambah (Create)</option>
            <option value="update">Ubah (Update)</option>
            <option value="delete">Hapus (Delete)</option>
            <option value="stock_in">Stok Masuk</option>
            <option value="outbound">Barang Keluar</option>
            <option value="ship">Kirim Mutasi</option>
            <option value="receive">Terima Mutasi</option>
            <option value="cancel">Batal Mutasi</option>
            <option value="opname_complete">Selesaikan Opname</option>
          </select>
        </div>

        <div className="space-y-1">
          <Label htmlFor="audit-entity" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Tipe Entitas</Label>
          <select
            id="audit-entity"
            name="audit_entity"
            value={filters.entity_type || ''}
            onChange={(e) => handleFilterChange({ ...filters, entity_type: e.target.value || null })}
            className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
          >
            <option value="">Semua Entitas</option>
            <option value="item">Barang (Item)</option>
            <option value="category">Kategori (Category)</option>
            <option value="supplier">Supplier</option>
            <option value="branch">Cabang (Branch)</option>
            <option value="user">User / Pengguna</option>
            <option value="stock_in">Transaksi Masuk</option>
            <option value="outbound">Transaksi Keluar</option>
            <option value="transfer">Mutasi Barang</option>
            <option value="stock_opname">Sesi Opname</option>
          </select>
        </div>
      </div>

      {/* Render custom collapsible table */}
      {renderAuditTable()}

      {/* Pagination */}
      {data && totalPages > 1 && (
        <div className="flex justify-between items-center px-2 py-4 border-t border-border">
          <span className="text-xs text-muted-foreground">
            Menampilkan {((page - 1) * pageSize) + 1} - {Math.min(page * pageSize, data.total)} dari {data.total} log audit
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

// Simple loader spinner
function LoaderSpinner() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-slate-400">
      <Terminal className="h-8 w-8 animate-pulse text-amber-500 mb-3" />
      <span className="text-sm font-medium">Memuat log audit...</span>
    </div>
  );
}
