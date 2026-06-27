import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranches } from '../../hooks/useBranches';
import { useCategories } from '../../hooks/useCategories';
import {
  useStockOpnameSession,
  useUpdateStockOpname,
  useCompleteStockOpname,
  useCancelStockOpname,
} from '../../hooks/useStockOpname';
import { ItemSearch } from '../../components/common/ItemSearch';
import { ImageLightbox } from '../../components/common/ImageLightbox';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { LoadingState } from '../../components/ui/LoadingState';
import { QuantityStepper } from '../../components/common/QuantityStepper';
import { EmptyState } from '../../components/ui/EmptyState';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft, Save, AlertTriangle, ShieldCheck, HelpCircle,
  Search, RotateCcw, XCircle, CheckCircle2, Image as ImageIcon,
  FileText, Loader2
} from 'lucide-react';
import { api } from '../../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface OpnameLineState {
  line_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  image_url?: string | null;
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
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const handleDownloadPdf = async () => {
    setDownloadingPdf(true);
    try {
      const response = await api.get(`/stock-opname/${id}/pdf`, {
        responseType: 'blob'
      });
      
      let filename = `stock_opname_OPN-${Number(id).toString().padStart(6, '0')}.pdf`;
      const disposition = response.headers['content-disposition'];
      if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
      }

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download PDF:', err);
      alert('Gagal mengunduh PDF.');
    } finally {
      setDownloadingPdf(false);
    }
  };

  const updateOpname = useUpdateStockOpname(sessionID);
  const completeOpname = useCompleteStockOpname();
  const cancelOpname = useCancelStockOpname();

  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<OpnameLineState[]>([]);
  const [filterItemId, setFilterItemId] = useState<number | null>(null);
  const [highlightedItemId, setHighlightedItemId] = useState<number | null>(null);

  // Dialogs
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [emptyCancelOpen, setEmptyCancelOpen] = useState(false);

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
          image_url: l.image_url,
          physical_quantity: l.physical_quantity,
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

  const getCategoryName = (id: number | null) =>
    id ? (categories?.find((c) => c.category_id === id)?.name || `Kategori #${id}`) : 'Semua Kategori';

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
    // Check if the item belongs to the session category
    if (session && session.category_id !== null && selectedItem.category_id !== session.category_id) {
      const targetCategoryName = categories?.find((c) => c.category_id === selectedItem.category_id)?.name || `ID #${selectedItem.category_id}`;
      setActionError(`Item '${selectedItem.name}' berada di kategori '${targetCategoryName}'. Anda harus melakukan opname untuk kategori tersebut untuk membuat penyesuaian pada item tersebut.`);
      setFilterItemId(null);
      return;
    }

    const match = lines.find((l) => l.item_id === selectedItem.item_id);
    if (match) {
      setFilterItemId(null); // Clear filter to display the entire list
      setActionError(null);
      setHighlightedItemId(selectedItem.item_id);
      
      // Scroll to the selected item smoothly
      setTimeout(() => {
        const el = document.getElementById(`opname-line-item-${selectedItem.item_id}`);
        if (el) {
          el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);

      // Fade out highlight after 3 seconds
      setTimeout(() => {
        setHighlightedItemId(null);
      }, 3000);
    } else {
      // Fallback: Add it as a new line if same category but somehow not pre-populated
      setLines(prev => [...prev, {
        line_id: -selectedItem.item_id, // temporary id
        item_id: selectedItem.item_id,
        item_code: selectedItem.item_code || '',
        item_name: selectedItem.name || 'Item',
        image_url: selectedItem.image_url,
        physical_quantity: 0,
        system_quantity: 0,
        variance: 0,
      }]);
      setFilterItemId(null);
      setActionError(null);
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
  const handleCancelConfirm = async () => {
    try {
      await cancelOpname.mutateAsync(sessionID);
      setCancelOpen(false);
      setEmptyCancelOpen(false);
      navigate('/operations/stock-opname');
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.detail || 'Gagal membatalkan opname');
    }
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
      <div className="flex items-start gap-3">
        <motion.div whileTap={{ scale: 0.95 }} className="mt-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate('/operations/stock-opname')}
            className="text-slate-400 hover:text-white rounded-lg h-10 w-10 border border-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
        <div className="flex-1">
          <PageHeader
            title={`Sesi Opname #${session.session_id}`}
            description="Pencatatan jumlah fisik stock gudang dan audit stock opname."
            action={
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center px-3 py-1.5 rounded-xl text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20 shadow-[0_0_12px_rgba(245,158,11,0.05)]">
                  Kategori: {getCategoryName(session.category_id)}
                </span>
                {getStatusBadge(session.status)}
                <Button
                  variant="outline"
                  size="sm"
                  disabled={downloadingPdf}
                  onClick={handleDownloadPdf}
                  className="border-slate-800 hover:bg-slate-900 text-slate-350 flex items-center gap-1.5 rounded-xl min-h-[36px] px-3 text-xs"
                >
                  {downloadingPdf ? (
                    <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                  ) : (
                    <FileText className="h-4 w-4 text-slate-400" />
                  )}
                  <span>Cetak PDF</span>
                </Button>
              </div>
            }
          />
        </div>
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
                  const isHighlighted = line.item_id === highlightedItemId;
                  const liveVariance = isCompleted
                    ? (line.variance ?? 0)
                    : line.physical_quantity - line.system_quantity;

                  return (
                    <motion.div
                      layout
                      key={line.line_id}
                      id={`opname-line-item-${line.item_id}`}
                      className={`border rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-500 ${
                        isHighlighted 
                          ? 'border-amber-500/80 bg-amber-950/20 shadow-[0_0_15px_rgba(245,158,11,0.2)] ring-1 ring-amber-500/30 scale-[1.02]' 
                          : 'border-border bg-slate-900/40'
                      }`}
                    >
                      {/* Item Info */}
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-950 overflow-hidden border border-slate-800 flex">
                          {line.image_url ? (
                            <ImageLightbox src={line.image_url} alt={line.item_name} triggerClassName="h-full w-full">
                              <img src={line.image_url} alt={line.item_name} className="h-full w-full object-cover" />
                            </ImageLightbox>
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{line.item_name}</p>
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-850 border border-slate-750 text-amber-500 inline-block mt-1">
                            {line.item_code}
                          </span>
                        </div>
                      </div>

                      {/* Count fields */}
                      <div className="flex items-center gap-5 justify-between sm:justify-end">
                        {/* System stock — always visible */}
                        <div className="text-right">
                          <span className="text-[10px] text-slate-500 block">Stok Sistem</span>
                          {line.line_id < 0 ? (
                            <div className="h-5 w-10 bg-slate-800/80 animate-pulse rounded ml-auto mt-1" />
                          ) : (
                            <span className="text-sm font-bold text-slate-300 font-mono">{line.system_quantity}</span>
                          )}
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
                              <QuantityStepper
                                value={line.physical_quantity}
                                onChange={(newQty) => handleQtyChange(line.line_id, newQty)}
                                min={0}
                                id={`physical_qty_${line.line_id}`}
                                name={`Fisik ${line.item_name}`}
                              />
                            </div>
                          )}
                        </div>

                        {/* Live variance badge — always shown */}
                        <div className="text-right min-w-[60px]">
                          <span className="text-[10px] text-slate-500 block">Selisih</span>
                          {line.line_id < 0 ? (
                            <div className="h-5 w-12 bg-slate-800/80 animate-pulse rounded ml-auto mt-1" />
                          ) : (
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded border ${varianceColor(liveVariance)}`}>
                              {liveVariance > 0 ? `+${liveVariance}` : liveVariance}
                            </span>
                          )}
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
                    onClick={() => {
                      if (lines.length === 0) {
                        setEmptyCancelOpen(true);
                      } else {
                        setConfirmOpen(true);
                      }
                    }}
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
      <ConfirmDialog
        open={confirmOpen}
        onOpenChange={setConfirmOpen}
        title="Konfirmasi Penyelesaian Opname"
        description="Periksa selisih sebelum menyetujui koreksi stok"
        confirmLabel="Ya, Selesaikan & Koreksi Stok"
        cancelLabel="Periksa Lagi"
        isLoading={completeOpname.isPending || updateOpname.isPending}
        className="sm:max-w-[520px] max-h-[90vh] flex flex-col"
        onConfirm={handleCompleteSubmit}
      >
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
      </ConfirmDialog>

      {/* ================================================================== */}
      {/* Cancel Confirmation Dialog                                           */}
      {/* ================================================================== */}
      <ConfirmDialog
        open={cancelOpen}
        onOpenChange={setCancelOpen}
        title="Batalkan Sesi Opname?"
        description="Apakah Anda yakin ingin membatalkan sesi ini? Sesi akan ditutup secara permanen dan tidak ada stok yang diubah."
        variant="destructive"
        confirmLabel="Ya, Batalkan Sesi"
        cancelLabel="Lanjutkan Opname"
        isLoading={cancelOpname.isPending}
        onConfirm={handleCancelConfirm}
      />

      <ConfirmDialog
        open={emptyCancelOpen}
        onOpenChange={setEmptyCancelOpen}
        title="Tidak dapat menyelesaikan opname kosong"
        description="Silakan tambahkan minimal satu barang."
        variant="destructive"
        confirmLabel="Batalkan Opname"
        cancelLabel="Tutup"
        isLoading={cancelOpname.isPending}
        onConfirm={handleCancelConfirm}
      />
    </div>
  );
}
