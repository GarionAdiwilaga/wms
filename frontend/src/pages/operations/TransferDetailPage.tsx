import { useState, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { 
  useTransfer, 
  useShipTransfer, 
  useCancelTransfer 
} from '../../hooks/useTransfers';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { motion } from 'framer-motion';
import { ArrowLeft, Truck, CheckCircle2, XCircle, AlertCircle, FileText, ArrowRight } from 'lucide-react';

export function TransferDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  const transferId = Number(id);
  const { data: transfer, isLoading, error } = useTransfer(transferId);
  const { data: branches } = useBranches();
  
  const shipTransfer = useShipTransfer();
  const cancelTransfer = useCancelTransfer();

  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) return <LoadingState />;
  if (error || !transfer) {
    return (
      <EmptyState
        title="Mutasi tidak ditemukan"
        description="Transaksi mutasi barang yang Anda cari tidak ada atau Anda tidak memiliki izin akses."
      />
    );
  }

  const getBranchName = (branchId: number) => {
    return branches?.find((b) => b.branch_id === branchId)?.name || `Cabang #${branchId}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <AlertCircle className="h-3.5 w-3.5" /> Draft
          </span>
        );
      case 'in_transit':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <Truck className="h-3.5 w-3.5" /> Dalam Perjalanan
          </span>
        );
      case 'received':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="h-3.5 w-3.5" /> Diterima
          </span>
        );
      case 'cancelled':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
            <XCircle className="h-3.5 w-3.5" /> Dibatalkan
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

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Auth checks
  const isSuperAdmin = user?.role === 'super_admin';
  const isSourceBranch = user?.branch_id === transfer.source_branch_id;
  const isDestBranch = user?.branch_id === transfer.dest_branch_id;

  const canShip = transfer.status === 'draft' && (isSuperAdmin || (user?.role === 'branch_head' && isSourceBranch));
  const canCancel = (transfer.status === 'draft' || transfer.status === 'in_transit') && 
                    (isSuperAdmin || (user?.role === 'branch_head' && (isSourceBranch || isDestBranch)));
  const canReceive = transfer.status === 'in_transit' && (isSuperAdmin || (user?.role === 'branch_head' && isDestBranch));

  const handleShip = async () => {
    setActionError(null);
    try {
      await shipTransfer.mutateAsync(transferId);
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Gagal mengubah status menjadi Kirim');
    }
  };

  const handleCancelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionError(null);
    if (!cancelReason.trim()) {
      setActionError('Alasan pembatalan harus diisi');
      return;
    }
    try {
      await cancelTransfer.mutateAsync({
        id: transferId,
        data: { cancellation_reason: cancelReason },
      });
      setCancelOpen(false);
      setCancelReason('');
    } catch (err: any) {
      setActionError(err.response?.data?.detail || 'Gagal membatalkan transfer');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/operations/transfers')}
            className="text-slate-400 hover:text-white rounded-lg h-10 w-10 border border-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
        <PageHeader
          title={`Detail Mutasi: ${transfer.transfer_number}`}
          description="Status logistik, data pengirim, penerima, dan item transfer."
        />
      </div>

      {/* Main Grid: Details + Items */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Side: Summary & Items List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card - Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-lg text-white">Status Logistik</h3>
              {getStatusBadge(transfer.status)}
            </div>

            {/* Routing indicator */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-slate-950 p-4 rounded-lg border border-slate-850">
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500">Gudang Asal</span>
                <p className="font-bold text-white text-base truncate">{getBranchName(transfer.source_branch_id)}</p>
              </div>
              <div className="flex items-center justify-center">
                <ArrowRight className="h-6 w-6 text-amber-500 animate-pulse hidden sm:block" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-500">Gudang Tujuan</span>
                <p className="font-bold text-white text-base truncate">{getBranchName(transfer.dest_branch_id)}</p>
              </div>
            </div>

            {/* General Info list */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm text-slate-300">
              <div className="flex items-start gap-2">
                <FileText className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-semibold text-white block">Catatan Pengirim:</span>
                  <span className="text-slate-400">{transfer.notes || 'Tidak ada catatan'}</span>
                </div>
              </div>
              {transfer.status === 'received' && (
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="h-4 w-4 text-slate-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-white block">Catatan Penerima:</span>
                    <span className="text-slate-400">{transfer.received_notes || 'Tidak ada catatan'}</span>
                  </div>
                </div>
              )}
              {transfer.status === 'cancelled' && (
                <div className="flex items-start gap-2 col-span-1 sm:col-span-2 border-t border-red-500/10 pt-3">
                  <XCircle className="h-4 w-4 text-red-500 mt-0.5 flex-shrink-0" />
                  <div>
                    <span className="font-semibold text-red-400 block">Alasan Pembatalan:</span>
                    <span className="text-slate-300">{transfer.cancellation_reason || '-'}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Items Card - Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3">
              Daftar Barang Transfer ({transfer.lines.length} items)
            </h3>
            
            <div className="space-y-3">
              {transfer.lines.map((line) => {
                const hasVariance = transfer.status === 'received' && 
                                    line.received_quantity !== null && 
                                    line.received_quantity !== line.sent_quantity;
                const varianceVal = line.received_quantity !== null ? line.received_quantity - line.sent_quantity : 0;
                
                return (
                  <div 
                    key={line.line_id} 
                    className={`border rounded-lg p-4 bg-slate-900/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      hasVariance ? 'border-red-500/30 bg-red-500/5' : 'border-slate-850'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{line.item_name || 'Komponen'}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-1">
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-850 border border-slate-750 text-amber-500">
                          {line.item_code}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6 justify-between sm:justify-end">
                      <div className="text-right">
                        <span className="text-xs text-slate-500">Dikirim</span>
                        <p className="text-sm font-bold text-white font-mono">{line.sent_quantity} pcs</p>
                      </div>
                      
                      {transfer.status === 'received' && (
                        <>
                          <div className="text-right">
                            <span className="text-xs text-slate-500">Diterima</span>
                            <p className="text-sm font-bold text-white font-mono">{line.received_quantity ?? 0} pcs</p>
                          </div>
                          
                          <div className="text-right min-w-[70px]">
                            <span className="text-xs text-slate-500 block">Selisih</span>
                            <span className={`text-sm font-bold font-mono px-2 py-0.5 rounded ${
                              varianceVal === 0 
                                ? 'text-slate-400 bg-slate-800' 
                                : 'text-red-400 bg-red-500/10'
                            }`}>
                              {varianceVal > 0 ? `+${varianceVal}` : varianceVal}
                            </span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Inline variance explanation */}
                    {hasVariance && (
                      <div className="w-full sm:hidden border-t border-red-500/10 pt-2 mt-1 text-xs text-red-400">
                        <span className="font-semibold">Alasan Selisih:</span> {line.variance_reason || 'Tidak ada alasan'} | {line.variance_notes || 'Tidak ada catatan'}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Side: Timeline & Operational Controls */}
        <div className="space-y-6">
          {/* Action Panel - Bento Box */}
          {(canShip || canReceive || canCancel) && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
              <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3">
                Operational Controls
              </h3>
              
              {actionError && (
                <div className="text-sm bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg font-medium break-words">
                  {actionError}
                </div>
              )}

              <div className="space-y-3">
                {/* Ship Action */}
                {canShip && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={handleShip}
                      disabled={shipTransfer.isPending}
                      className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:opacity-90 border-0 text-white font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                    >
                      {shipTransfer.isPending ? 'Mengirim...' : 'Kirim Barang'}
                    </Button>
                  </motion.div>
                )}

                {/* Receive Action */}
                {canReceive && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      onClick={() => navigate(`/operations/transfers/${transferId}/receive`)}
                      className="w-full bg-gradient-to-r from-emerald-500 to-emerald-650 hover:opacity-90 border-0 text-white font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                    >
                      Terima & Hitung Barang
                    </Button>
                  </motion.div>
                )}

                {/* Cancel Action */}
                {canCancel && (
                  <motion.div whileTap={{ scale: 0.97 }}>
                    <Button
                      variant="ghost"
                      onClick={() => setCancelOpen(true)}
                      className="w-full text-red-400 hover:text-red-300 hover:bg-red-450/10 rounded-xl min-h-[44px] border border-red-500/20"
                    >
                      Batalkan Transfer
                    </Button>
                  </motion.div>
                )}
              </div>
            </div>
          )}

          {/* Timeline Card - Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3">
              Jejak Transaksi
            </h3>
            
            <div className="relative border-l border-slate-800 pl-4 ml-2 space-y-5">
              {/* Created */}
              <div className="relative">
                <div className="absolute -left-[21px] mt-0.5 h-3 w-3 rounded-full bg-blue-500 border border-slate-950" />
                <p className="text-xs font-semibold text-slate-400">Mutasi Dibuat</p>
                <p className="text-xs text-white">{formatDate(transfer.created_at)}</p>
                <span className="text-[10px] text-slate-500 block">Oleh: User #{transfer.created_by}</span>
              </div>

              {/* Shipped */}
              {transfer.shipped_at && (
                <div className="relative">
                  <div className="absolute -left-[21px] mt-0.5 h-3 w-3 rounded-full bg-amber-500 border border-slate-950" />
                  <p className="text-xs font-semibold text-slate-400">Mutasi Dikirim</p>
                  <p className="text-xs text-white">{formatDate(transfer.shipped_at)}</p>
                  <span className="text-[10px] text-slate-500 block">Oleh: User #{transfer.shipped_by}</span>
                </div>
              )}

              {/* Received */}
              {transfer.received_at && (
                <div className="relative">
                  <div className="absolute -left-[21px] mt-0.5 h-3 w-3 rounded-full bg-emerald-500 border border-slate-950" />
                  <p className="text-xs font-semibold text-slate-400">Mutasi Diterima</p>
                  <p className="text-xs text-white">{formatDate(transfer.received_at)}</p>
                  <span className="text-[10px] text-slate-500 block">Oleh: User #{transfer.received_by}</span>
                </div>
              )}

              {/* Cancelled */}
              {transfer.cancelled_at && (
                <div className="relative">
                  <div className="absolute -left-[21px] mt-0.5 h-3 w-3 rounded-full bg-red-500 border border-slate-950" />
                  <p className="text-xs font-semibold text-slate-400">Mutasi Dibatalkan</p>
                  <p className="text-xs text-white">{formatDate(transfer.cancelled_at)}</p>
                  <span className="text-[10px] text-slate-500 block">Oleh: User #{transfer.cancelled_by}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Cancel Dialog */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white">Batalkan Mutasi</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Tindakan ini akan menghentikan alur mutasi barang. Alasan pembatalan wajib disertakan.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCancelSubmit} className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="cancellation_reason" className="text-slate-300">Alasan Pembatalan</Label>
              <textarea
                id="cancellation_reason"
                name="cancellation_reason"
                placeholder="Contoh: Barang kurang/rusak sebelum dikirim, kesalahan pilih cabang tujuan, dll..."
                value={cancelReason}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setCancelReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm resize-none"
                required
              />
            </div>
            
            {actionError && (
              <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg">
                {actionError}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setCancelOpen(false);
                  setCancelReason('');
                  setActionError(null);
                }}
                className="border border-slate-850 text-slate-400 hover:text-white rounded-lg"
              >
                Kembali
              </Button>
              <Button
                type="submit"
                className="bg-red-550 hover:bg-red-600 border-0 text-white font-semibold rounded-lg"
              >
                Konfirmasi Batal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
