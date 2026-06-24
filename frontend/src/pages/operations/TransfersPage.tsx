import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { useTransfers } from '../../hooks/useTransfers';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { PaginationControl } from '../../components/ui/PaginationControl';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Calendar, Plus, Truck, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export function TransfersPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const { data: branches } = useBranches();
  
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const activeBranchId = user?.role === 'super_admin' ? (branchFilter ? Number(branchFilter) : null) : user?.branch_id;

  const { data: transfersResponse, isLoading } = useTransfers({
    branch_id: activeBranchId,
    status: statusFilter || null,
    page,
    page_size: pageSize,
  });

  const getBranchName = (id: number) => {
    return branches?.find((b) => b.branch_id === id)?.name || `Cabang #${id}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <AlertCircle className="h-3 w-3" /> Draft
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-450 text-amber-400 border border-amber-500/20">
            <Truck className="h-3 w-3" /> Dikirim
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3 w-3" /> Diterima
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="h-3 w-3" /> Dibatalkan
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
            {status}
          </span>
        );
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const isSuperAdmin = user?.role === 'super_admin';

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <PageHeader
          title="Mutasi Barang"
          description="Kelola transfer stock komponen trophy antar-gudang cabang."
        />
        <motion.div whileTap={{ scale: 0.97 }} className="self-start sm:self-auto">
          <Button
            onClick={() => navigate('/operations/transfers/new')}
            className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px] shadow-md flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Buat Transfer
          </Button>
        </motion.div>
      </div>

      {/* Filters Panel - Bento Box */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-lg grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
        {/* Branch selection for Super Admin */}
        {isSuperAdmin && (
          <div className="space-y-2">
            <label htmlFor="branch_filter" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cabang</label>
            <select
              id="branch_filter"
              name="branch_filter"
              value={branchFilter}
              onChange={(e) => {
                setBranchFilter(e.target.value);
                setPage(1);
              }}
              className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm"
            >
              <option value="">Semua Cabang</option>
              {branches?.filter(b => b.is_active).map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Status Selection */}
        <div className="space-y-2">
          <label htmlFor="status_filter" className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Status</label>
          <select
            id="status_filter"
            name="status_filter"
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm"
          >
            <option value="">Semua Status</option>
            <option value="draft">Draft</option>
            <option value="in_transit">Dikirim (In Transit)</option>
            <option value="received">Diterima (Received)</option>
            <option value="cancelled">Dibatalkan (Cancelled)</option>
          </select>
        </div>

        {/* Clear Filters Button */}
        <div>
          <motion.div whileTap={{ scale: 0.97 }}>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setStatusFilter('');
                setBranchFilter('');
                setPage(1);
              }}
              className="w-full border-slate-800 hover:bg-slate-800 text-slate-350 rounded-lg h-10"
            >
              Reset Filter
            </Button>
          </motion.div>
        </div>
      </div>

      {/* Main List */}
      {isLoading ? (
        <LoadingState />
      ) : !transfersResponse || transfersResponse.data.length === 0 ? (
        <EmptyState
          title="Tidak ada transaksi mutasi"
          description="Silakan buat mutasi barang jika ingin mengirim stok ke cabang lain."
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {transfersResponse.data.map((transfer, idx) => (
              <motion.div
                key={transfer.transfer_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.05 }}
                className="bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-5 hover:border-slate-800 transition-all cursor-pointer"
                onClick={() => navigate(`/operations/transfers/${transfer.transfer_id}`)}
              >
                {/* Left Side: Number, Branches Router, Date */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white font-mono text-sm">
                      {transfer.transfer_number}
                    </h3>
                    {getStatusBadge(transfer.status)}
                  </div>

                  {/* Branches Transfer flow graphic */}
                  <div className="flex items-center gap-3 py-1 text-sm">
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Asal</p>
                      <p className="font-bold text-white truncate">{getBranchName(transfer.source_branch_id)}</p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-slate-650 flex-shrink-0 mt-4 text-amber-500" />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider">Tujuan</p>
                      <p className="font-bold text-white truncate">{getBranchName(transfer.dest_branch_id)}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-450 text-slate-450">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-600" />
                      {formatDate(transfer.created_at)}
                    </span>
                    <span>•</span>
                    <span>Item: {transfer.lines.length} jenis</span>
                  </div>
                </div>

                {/* Right Side: Action Trigger */}
                <div className="flex items-center justify-end gap-3 self-end md:self-auto">
                  <div className="text-right hidden sm:block mr-2">
                    <p className="text-xs text-slate-500">Jumlah Kirim</p>
                    <p className="text-sm font-bold text-white font-mono">
                      {transfer.lines.reduce((sum, l) => sum + l.sent_quantity, 0)} pcs
                    </p>
                  </div>
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-slate-800 text-slate-300 hover:text-white rounded-lg px-4 h-9"
                    >
                      Detail
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pagination */}
          {transfersResponse && (
            <PaginationControl
              currentPage={page}
              totalPages={transfersResponse.total_pages}
              totalItems={transfersResponse.total}
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
