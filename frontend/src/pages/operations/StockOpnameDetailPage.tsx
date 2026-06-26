import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranches } from '../../hooks/useBranches';
import { useCategories } from '../../hooks/useCategories';
import {
  useStockOpnameSession,
  useUpdateStockOpname,
  useCompleteStockOpname,
} from '../../hooks/useStockOpname';
import { ItemSearch } from '../../components/common/ItemSearch';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, AlertTriangle, ShieldCheck, HelpCircle,
  Plus, Minus, Search, RotateCcw, XCircle, CheckCircle2,
} from 'lucide-react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpnameLineState {
  line_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  /** What the user physically counted */
  physical_quantity: number;
  /** Snapshot from the database at session creation */
  system_quantity: number;
  variance?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function varianceColor(v: number): string {
  if (v === 0) return 'text-slate-400 bg-slate-800 border-slate-700';
  return v > 0
    ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
    : 'text-red-400 bg-red-500/10 border-red-500/30';
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function StockOpnameDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const sessionID = Number(id);
  const { data: session, isLoading, error } = useStockOpnameSession(sessionID);
  const { data: branches } = useBranches();
  const { data: categories } = useCategories();

  const updateOpname = useUpdateStockOpname(sessionID);
  const completeOpname = useCompleteStockOpname();

  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OpnameLineState[]>([]);
  const [filterItemId, setFilterItemId] = useState<number | null>(null);

  // Dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  // Feedback
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Sync state from server
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (session) {
      setNotes(session.notes || '');
      setLines(
        session.lines.map((l) => ({
          line_id: l.line_id,
          item_id: l.item_id,
          item_code: l.item_code || '',
          item_name: l.item_name || 'Item',
          // ✅ Req 2: default physical to system_quantity, not 0
          physical_quantity: l.physical_quantity !== 0
            ? l.physical_quantity
            : l.system_quantity,
          system_quantity: l.system_quantity,
          variance: l.variance,
        }))
      );
    }
  }, [session]);

  if (isLoading) return <LoadingState />;
  if (error || !session) {
    return (
      <EmptyState
        title="Sesi Opname tidak ditemukan"
        description="Sesi opname stok yang Anda cari tidak ada atau Anda tidak memiliki izin akses."
      />
    );
  }

  // ---------------------------------------------------------------------------
  // Helpers
  // ---------------------------------------------------------------------------
  const getBranchName = (id: number) =>
    branches?.find((b) => b.branch_id === id)?.name || `Cabang #${id}`;

  const getCategoryName = (id: number) =>
    categories?.find((c) => c.category_id === id)?.name || `Kategori #${id}`;

  // ---------------------------------------------------------------------------
  // Quantity change — recalculates live variance
  // ---------------------------------------------------------------------------
  const handleQtyChange = (lineId: number, val: number) => {
    setLines((prev) =>
      prev.map((l) => {
        if (l.line_id !== lineId) return l;
        const physical = Math.max(0, val);
        return { ...l, physical_quantity: physical, variance: physical - l.system_quantity };
      })
    );
  };

  // ---------------------------------------------------------------------------
  // Item search focus
  // ---------------------------------------------------------------------------
  const handleItemSearchSelect = (selectedItem: any) => {
    const match = lines.find((l) => l.item_id === selectedItem.item_id);
    if (match) {
      setFilterItemId(selectedItem.item_id);
      setActionError(null);
    } else {
      setActionError(`Item '${selectedItem.name}' tidak terdaftar dalam kategori opname ini.`);
    }
  };

  // ---------------------------------------------------------------------------
  // Save draft
  // ---------------------------------------------------------------------------
  const handleSaveDraft = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      await updateOpname.mutateAsync({
        notes: notes || null,
        lines: lines.map((l) => ({
          line_id: l.line_id,
          item_id: l.item_id,
          physical_quantity: l.physical_quantity,
        })),
      });
      setActionSuccess('Draft fisik opname berhasil disimpan!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.detail || 'Gagal menyimpan draft opname');
    }
  };

  // ---------------------------------------------------------------------------
  // Cancel stocktake (deletes draft, redirects)
  // ---------------------------------------------------------------------------
  const handleCancelConfirm = () => {
    // Clear local state and redirect — the session stays in DB as draft
    // but the user is returned to the list. A future cleanup job can prune old drafts.
    setCancelOpen(false);
    navigate('/operations/stock-opname');
  };

  // ---------------------------------------------------------------------------
  // Complete stocktake — called from review modal
  // ---------------------------------------------------------------------------
  const handleCompleteSubmit = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      // Always save current counts first
      await updateOpname.mutateAsync({
        notes: notes || null,
        lines: lines.map((l) => ({
          line_id: l.line_id,
          item_id: l.item_id,
          physical_quantity: l.physical_quantity,
        })),
      });
      await completeOpname.mutateAsync(sessionID);
      setConfirmOpen(false);
      setActionSuccess('Sesi opname stok berhasil diselesaikan!');
      setTimeout(() => navigate('/operations/stock-opname'), 1500);
    } catch (err: any) {
      console.error(err);
      setConfirmOpen(false);
      setActionError(err.response?.data?.detail || 'Gagal menyelesaikan opname stok');
    }
  };

  // ---------------------------------------------------------------------------
  // Derived state for review modal
  // ---------------------------------------------------------------------------
  // Lines with non-zero variance (physical ≠ system)
  const linesWithVariance = lines.filter((l) => {
    const v = l.physical_quantity - l.system_quantity;
    return v !== 0;
  });

  const filteredLines = filterItemId ? lines.filter((l) => l.item_id === filterItemId) : lines;
  const isDraft = session.status === 'draft';

  // ---------------------------------------------------------------------------
  // Status badge
  // ---------------------------------------------------------------------------
  const getStatusBadge = (status: string) => {
    if (status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <HelpCircle className="h-3.5 w-3.5" /> Draft
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <ShieldCheck className="h-3.5 w-3.5" /> Selesai
      </span>
    );
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/operations/stock-opname')}
            className="text-slate-400 hover:text-white rounded-lg h-10 w-10 border border-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
        <PageHeader
          title={`Sesi Opname #${session.session_id}`}
          description="Pencatatan jumlah fisik stock gudang dan audit stock opname."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* ---------------------------------------------------------------- */}
        {/* Left Column — Item count sheet                                    */}
        {/* ---------------------------------------------------------------- */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Search / Focus */}
          {isDraft && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-amber-500" />
                  Cari &amp; Fokus Item
                </h3>
                {filterItemId && (
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setFilterItemId(null)}
                      className="text-xs text-amber-500 hover:text-amber-400 font-semibold flex items-center gap-1 border border-amber-500/20 px-2 h-7"
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> Tampilkan Semua
                    </Button>
                  </motion.div>
                )}
              </div>
              <ItemSearch
                onSelect={handleItemSearchSelect}
                clearOnSelect={true}
                branchId={session.branch_id}
              />
            </div>
          )}

          {/* Count Sheet */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4 min-h-[300px]">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3 flex justify-between items-center">
              <span>Baris Opname ({lines.length} items)</span>
              {filterItemId && <span className="text-xs text-amber-500">Hasil Filter</span>}
            </h3>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {filteredLines.map((line) => {
                  const isCompleted = session.status === 'completed';
                  // Live variance for draft; server variance for completed
                  const liveVariance = isCompleted
                    ? (line.variance ?? 0)
                    : line.physical_quantity - line.system_quantity;

                  return (
                    <motion.div
                      layout
                      key={line.line_id}
                      className="border border-border bg-slate-900/40 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                    >
                      {/* Item Info */}
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-white truncate">{line.item_name}</p>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-850 border border-slate-750 text-amber-500 inline-block mt-1">
                          {line.item_code}
                        </span>
                      </div>

                      {/* Count fields */}
                      <div className="flex items-center gap-5 justify-between sm:justify-end">
                        {/* System stock — always visible */}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Stok Sistem</span>
                          <span className="text-sm font-bold text-slate-300 font-mono">{line.system_quantity}</span>
                        </div>

                        {/* Physical count — stepper when draft, read-only when completed */}
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">Fisik</span>
                              <span className="text-sm font-bold text-white font-mono">{line.physical_quantity}</span>
                            </div>
                          ) : (
                            <div className="flex flex-col items-end">
                              <span className="text-[10px] text-slate-500 block mb-0.5">Jumlah Fisik</span>
                              <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-850 rounded-lg p-1">
                                <motion.div whileTap={{ scale: 0.85 }}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQtyChange(line.line_id, line.physical_quantity - 1)}
                                    className="h-7 w-7 text-slate-400 hover:text-white rounded-md"
                                    disabled={line.physical_quantity <= 0}
                                  >
                                    <Minus className="h-3.5 w-3.5" />
                                  </Button>
                                </motion.div>

                                <label htmlFor={`physical_qty_${line.line_id}`} className="sr-only">
                                  Jumlah Fisik {line.item_name}
                                </label>
                                <input
                                  id={`physical_qty_${line.line_id}`}
                                  name={`physical_qty_${line.line_id}`}
                                  type="number"
                                  value={line.physical_quantity}
                                  onChange={(e) => handleQtyChange(line.line_id, parseInt(e.target.value) || 0)}
                                  className="bg-transparent text-white w-12 text-center text-sm font-bold font-mono focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                  min={0}
                                />

                                <motion.div whileTap={{ scale: 0.85 }}>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => handleQtyChange(line.line_id, line.physical_quantity + 1)}
                                    className="h-7 w-7 text-slate-400 hover:text-white rounded-md"
                                  >
                                    <Plus className="h-3.5 w-3.5" />
                                  </Button>
                                </motion.div>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* Live variance badge — always shown */}
                        <div className="text-right min-w-[60px]">
                          <span className="text-[10px] text-slate-500 block">Selisih</span>
                          <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${varianceColor(liveVariance)}`}>
                            {liveVariance > 0 ? `+${liveVariance}` : liveVariance}
                          </span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Right Column — Controls & Metadata                               */}
        {/* ---------------------------------------------------------------- */}
        <div className="space-y-6">
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3 flex justify-between items-center">
              <span>Detail Sesi</span>
              {getStatusBadge(session.status)}
            </h3>

            <div className="space-y-3 text-sm text-slate-300">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Gudang Cabang</span>
                <p className="font-bold text-white mt-0.5">{getBranchName(session.branch_id)}</p>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500">Kategori Audit</span>
                <p className="font-bold text-white mt-0.5">{getCategoryName(session.category_id)}</p>
              </div>

              {/* Notes */}
              <div className="space-y-1">
                <Label htmlFor="session_notes" className="text-[10px] uppercase font-bold text-slate-500">Catatan Audit</Label>
                {isDraft ? (
                  <textarea
                    id="session_notes"
                    name="session_notes"
                    value={notes}
                    onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Tuliskan catatan detail audit..."
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary resize-none shadow-sm"
                  />
                ) : (
                  <p className="text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-850/50">
                    {session.notes || 'Tidak ada catatan'}
                  </p>
                )}
              </div>
            </div>

            {/* Feedback */}
            {actionError && (
              <div className="text-sm bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg font-medium break-words">
                {actionError}
              </div>
            )}
            {actionSuccess && (
              <div className="text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg font-medium">
                {actionSuccess}
              </div>
            )}

            {/* ---- Action Buttons (draft only) ---- */}
            {isDraft && (
              <div className="space-y-2 pt-2">
                {/* Save Draft */}
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={handleSaveDraft}
                    disabled={updateOpname.isPending}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 font-semibold rounded-xl min-h-[44px] shadow-sm flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" /> Simpan Draft
                  </Button>
                </motion.div>

                {/* Complete — opens review modal */}
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 border-0 text-white font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                  >
                    <CheckCircle2 className="h-4 w-4" /> Selesaikan Opname
                  </Button>
                </motion.div>

                {/* Cancel — opens confirmation */}
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setCancelOpen(true)}
                    className="w-full border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 font-semibold rounded-xl min-h-[44px] flex items-center justify-center gap-2 transition-all"
                  >
                    <XCircle className="h-4 w-4" /> Batalkan Opname
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ================================================================== */}
      {/* Pre-Commit Review Modal                                              */}
      {/* ================================================================== */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[520px] bg-slate-900 border-slate-800 text-white rounded-xl max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-xl bg-emerald-500/15 flex items-center justify-center flex-shrink-0">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-white text-base">Konfirmasi Penyelesaian Opname</DialogTitle>
                <p className="text-xs text-slate-400 mt-0.5">Periksa selisih sebelum menyetujui koreksi stok</p>
              </div>
            </div>
          </DialogHeader>

          {/* Variance summary list — scrollable */}
          <div className="flex-1 overflow-y-auto min-h-0 my-3 space-y-3">
            {linesWithVariance.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-8 text-center">
                <CheckCircle2 className="h-9 w-9 text-emerald-500" />
                <p className="text-sm font-semibold text-emerald-400">Tidak ada selisih stok</p>
                <p className="text-xs text-slate-500">Semua jumlah fisik sesuai dengan catatan sistem.</p>
              </div>
            ) : (
              <>
                <p className="text-xs text-slate-400 px-1">
                  <span className="font-semibold text-white">{linesWithVariance.length}</span> item memiliki selisih dan akan dikoreksi secara otomatis:
                </p>
                {linesWithVariance.map((line) => {
                  const v = line.physical_quantity - line.system_quantity;
                  return (
                    <div
                      key={line.line_id}
                      className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white truncate">{line.item_name}</p>
                        <p className="text-[10px] text-slate-500 font-mono">{line.item_code}</p>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0 text-xs font-mono">
                        <span className="text-slate-400">{line.system_quantity}</span>
                        <span className="text-slate-600">→</span>
                        <span className="text-white font-bold">{line.physical_quantity}</span>
                        <span className={`font-bold px-2 py-0.5 rounded border ${varianceColor(v)}`}>
                          {v > 0 ? `+${v}` : v}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </>
            )}

            {/* Always-visible irreversible warning */}
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 mt-2">
              <AlertTriangle className="h-4 w-4 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">
                Tindakan ini <strong>bersifat final dan tidak dapat diubah</strong>. Koreksi stok akan langsung diterapkan ke kartu stok gudang melalui jurnal penyesuaian otomatis.
              </p>
            </div>
          </div>

          <DialogFooter className="flex-shrink-0 gap-2 sm:gap-0 border-t border-slate-800 pt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setConfirmOpen(false)}
              className="border border-slate-850 text-slate-400 hover:text-white rounded-lg w-full sm:w-auto"
              disabled={completeOpname.isPending || updateOpname.isPending}
            >
              Periksa Lagi
            </Button>
            <Button
              type="button"
              onClick={handleCompleteSubmit}
              disabled={completeOpname.isPending || updateOpname.isPending}
              className="bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 border-0 text-white font-semibold rounded-lg w-full sm:w-auto"
            >
              {completeOpname.isPending || updateOpname.isPending
                ? 'Memproses...'
                : 'Ya, Selesaikan & Koreksi Stok'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ================================================================== */}
      {/* Cancel Confirmation Dialog                                           */}
      {/* ================================================================== */}
      <Dialog open={cancelOpen} onOpenChange={setCancelOpen}>
        <DialogContent className="sm:max-w-[420px] bg-slate-900 border-slate-800 text-white rounded-xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <div className="h-12 w-12 rounded-xl bg-red-500/15 flex items-center justify-center mb-3">
              <XCircle className="h-7 w-7 text-red-400" />
            </div>
            <DialogTitle className="text-white">Batalkan Sesi Opname?</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Anda akan meninggalkan sesi ini. Data yang belum disimpan akan hilang, namun sesi draft tetap tersimpan di sistem dan dapat dilanjutkan nanti.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter className="gap-2 sm:gap-0 mt-4">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCancelOpen(false)}
              className="border border-slate-850 text-slate-400 hover:text-white rounded-lg w-full sm:w-auto"
            >
              Lanjutkan Opname
            </Button>
            <Button
              type="button"
              onClick={handleCancelConfirm}
              className="bg-red-500/90 hover:bg-red-500 border-0 text-white font-semibold rounded-lg w-full sm:w-auto"
            >
              Ya, Tinggalkan
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
