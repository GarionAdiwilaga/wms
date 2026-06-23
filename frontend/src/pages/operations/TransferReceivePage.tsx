import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { useTransfer, useReceiveTransfer } from '../../hooks/useTransfers';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertTriangle, ArrowRight, ClipboardCheck } from 'lucide-react';

interface ReceiveItemLineState {
  line_id: number;
  item_id: number;
  item_name: string;
  item_code: string;
  sent_quantity: number;
  received_quantity: number;
  variance_reason: string;
  variance_notes: string;
}

export function TransferReceivePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  const transferId = Number(id);
  const { data: transfer, isLoading, error } = useTransfer(transferId);
  const { data: branches } = useBranches();
  const receiveTransfer = useReceiveTransfer();

  const [receivedNotes, setReceivedNotes] = useState('');
  const [linesState, setLinesState] = useState<ReceiveItemLineState[]>([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Initialize lines state when transfer loads
  useEffect(() => {
    if (transfer && transfer.lines) {
      const initialLines = transfer.lines.map((line) => ({
        line_id: line.line_id,
        item_id: line.item_id,
        item_name: line.item_name || 'Komponen',
        item_code: line.item_code || '',
        sent_quantity: line.sent_quantity,
        received_quantity: line.sent_quantity, // Default to shipped qty
        variance_reason: 'Kurang Kirim', // Default reason
        variance_notes: '',
      }));
      setLinesState(initialLines);
    }
  }, [transfer]);

  if (isLoading) return <LoadingState />;
  if (error || !transfer) {
    return (
      <EmptyState
        title="Mutasi tidak ditemukan"
        description="Transaksi mutasi barang yang Anda cari tidak ada atau Anda tidak memiliki izin akses."
      />
    );
  }

  // Security: only receiver or admin can receive
  const isSuperAdmin = user?.role === 'super_admin';
  const isDestBranch = user?.branch_id === transfer.dest_branch_id;
  const canReceive = transfer.status === 'in_transit' && (isSuperAdmin || (user?.role === 'branch_head' && isDestBranch));

  if (!canReceive) {
    return (
      <EmptyState
        title="Akses Ditolak"
        description="Anda tidak memiliki wewenang untuk menerima mutasi ini, atau status mutasi bukan dalam perjalanan."
      />
    );
  }

  const getBranchName = (branchId: number) => {
    return branches?.find((b) => b.branch_id === branchId)?.name || `Cabang #${branchId}`;
  };

  const handleQtyChange = (lineId: number, val: number) => {
    const qty = Math.max(0, val);
    setLinesState((prev) =>
      prev.map((l) => (l.line_id === lineId ? { ...l, received_quantity: qty } : l))
    );
  };

  const handleReasonChange = (lineId: number, reason: string) => {
    setLinesState((prev) =>
      prev.map((l) => (l.line_id === lineId ? { ...l, variance_reason: reason } : l))
    );
  };

  const handleLineNotesChange = (lineId: number, notes: string) => {
    setLinesState((prev) =>
      prev.map((l) => (l.line_id === lineId ? { ...l, variance_notes: notes } : l))
    );
  };

  const handleConfirmSubmit = async () => {
    setFormError(null);
    try {
      const payload = {
        received_notes: receivedNotes || null,
        lines: linesState.map((l) => {
          const hasVariance = l.received_quantity !== l.sent_quantity;
          return {
            line_id: l.line_id,
            received_quantity: l.received_quantity,
            variance_reason: hasVariance ? l.variance_reason : null,
            variance_notes: hasVariance ? (l.variance_notes || null) : null,
          };
        }),
      };

      await receiveTransfer.mutateAsync({
        id: transferId,
        data: payload,
      });

      setConfirmOpen(false);
      navigate(`/operations/transfers/${transferId}`);
    } catch (err: any) {
      console.error(err);
      setConfirmOpen(false);
      setFormError(err.response?.data?.detail || 'Gagal menyelesaikan penerimaan mutasi');
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
            onClick={() => navigate(`/operations/transfers/${transferId}`)}
            className="text-slate-400 hover:text-white rounded-lg h-10 w-10 border border-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
        <PageHeader
          title="Verifikasi Penerimaan"
          description={`Lakukan penghitungan fisik untuk mencocokkan stok masuk dari ${getBranchName(transfer.source_branch_id)}.`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Count Entry Sheet */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-lg text-white flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5 text-amber-500" />
                Penghitungan Fisik Item
              </h3>
            </div>

            <div className="space-y-4">
              <AnimatePresence initial={false}>
                {linesState.map((line) => {
                  const hasVariance = line.received_quantity !== line.sent_quantity;
                  const variance = line.received_quantity - line.sent_quantity;

                  return (
                    <motion.div
                      layout
                      key={line.line_id}
                      className={`border rounded-xl p-4 flex flex-col gap-4 transition-colors ${
                        hasVariance 
                          ? 'border-red-500/30 bg-red-500/5' 
                          : 'border-border bg-slate-900/40'
                      }`}
                    >
                      {/* Item Basic Info */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{line.item_name}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-850 border border-slate-750 text-amber-500 inline-block mt-1">
                            {line.item_code}
                          </span>
                        </div>

                        {/* Counts controls */}
                        <div className="flex items-center gap-4 justify-between sm:justify-end">
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Dikirim</span>
                            <span className="text-sm font-bold text-white font-mono">{line.sent_quantity} pcs</span>
                          </div>
                          
                          {/* Received Qty count input */}
                          <div className="flex flex-col items-end">
                            <span className="text-[10px] text-slate-500 block mb-0.5">Diterima Fisik</span>
                            <input
                              type="number"
                              value={line.received_quantity}
                              onChange={(e) => handleQtyChange(line.line_id, parseInt(e.target.value) || 0)}
                              className="w-20 h-9 px-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-center font-bold font-mono text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
                              min={0}
                            />
                          </div>

                          {/* Computed Variance Display */}
                          <div className="text-right min-w-[70px]">
                            <span className="text-[10px] text-slate-500 block">Selisih</span>
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                              variance === 0 
                                ? 'text-slate-400 bg-slate-800' 
                                : 'text-red-400 bg-red-500/10'
                            }`}>
                              {variance > 0 ? `+${variance}` : variance}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Variance Inputs (Conditional) */}
                      {hasVariance && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-slate-800"
                        >
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Alasan Selisih</Label>
                            <select
                              value={line.variance_reason}
                              onChange={(e) => handleReasonChange(line.line_id, e.target.value)}
                              className="w-full h-8 px-2 bg-slate-950 border border-slate-850 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                            >
                              <option value="Kurang Kirim">Kurang Kirim (Shortage)</option>
                              <option value="Rusak">Barang Rusak (Damaged)</option>
                              <option value="Tertukar">Barang Tertukar (Mismatch)</option>
                              <option value="Lainnya">Lainnya (Other)</option>
                            </select>
                          </div>
                          
                          <div className="space-y-1">
                            <Label className="text-[10px] uppercase font-bold text-slate-400">Catatan Selisih (Opsional)</Label>
                            <input
                              type="text"
                              placeholder="Keterangan kondisi fisik barang..."
                              value={line.variance_notes}
                              onChange={(e) => handleLineNotesChange(line.line_id, e.target.value)}
                              className="w-full h-8 px-2 bg-slate-950 border border-slate-850 rounded-md text-xs text-white focus:outline-none focus:ring-1 focus:ring-primary"
                            />
                          </div>
                        </motion.div>
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Routing & Submit Controls */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3">
              Konfirmasi Penerimaan
            </h3>

            {/* Source/Dest details display */}
            <div className="space-y-1 text-sm bg-slate-950 p-3 rounded-lg border border-slate-850">
              <p className="text-xs text-slate-500 uppercase font-semibold">Mutasi Rute</p>
              <div className="flex items-center justify-between text-white font-medium">
                <span>{getBranchName(transfer.source_branch_id)}</span>
                <ArrowRight className="h-3.5 w-3.5 text-amber-500" />
                <span>{getBranchName(transfer.dest_branch_id)}</span>
              </div>
            </div>

            {/* Received Notes */}
            <div className="space-y-2">
              <Label htmlFor="received_notes">Catatan Penerimaan (Opsional)</Label>
              <textarea
                id="received_notes"
                placeholder="Catatan umum mengenai kondisi pengiriman paket..."
                value={receivedNotes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setReceivedNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm resize-none"
              />
            </div>

            {formError && (
              <div className="text-sm bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg font-medium break-words">
                {formError}
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  onClick={() => setConfirmOpen(true)}
                  className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 border-0 text-white font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                >
                  Selesaikan Penerimaan
                </Button>
              </motion.div>
            </div>
          </div>
        </div>
      </div>

      {/* Irreversible Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white rounded-xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500 mb-2 animate-bounce" />
            <DialogTitle className="text-white text-lg">Konfirmasi Penerimaan Mutasi</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Harap pastikan jumlah fisik yang Anda hitung sudah benar. Penerimaan ini **bersifat final, mengunci transaksi, dan tidak dapat dibatalkan atau diubah** setelah dikonfirmasi.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              className="border border-slate-850 text-slate-400 hover:text-white rounded-lg w-full sm:w-auto"
            >
              Kembali
            </Button>
            <Button
              type="button"
              onClick={handleConfirmSubmit}
              disabled={receiveTransfer.isPending}
              className="bg-emerald-550 hover:bg-emerald-600 border-0 text-white font-semibold rounded-lg w-full sm:w-auto"
            >
              {receiveTransfer.isPending ? 'Memproses...' : 'Ya, Selesaikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
