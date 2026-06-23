import { useState, useEffect, ChangeEvent } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useBranches } from '../../hooks/useBranches';
import { useCategories } from '../../hooks/useCategories';
import { 
  useStockOpnameSession, 
  useUpdateStockOpname, 
  useCompleteStockOpname 
} from '../../hooks/useStockOpname';
import { ItemSearch } from '../../components/common/ItemSearch';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Save, AlertTriangle, ShieldCheck, HelpCircle, Plus, Minus, Search, RotateCcw } from 'lucide-react';

interface OpnameLineState {
  line_id: number;
  item_id: number;
  item_code: string;
  item_name: string;
  physical_quantity: number;
  system_quantity?: number;
  variance?: number;
}

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
  
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Sync state with loaded data
  useEffect(() => {
    if (session) {
      setNotes(session.notes || '');
      const mappedLines = session.lines.map((l) => ({
        line_id: l.line_id,
        item_id: l.item_id,
        item_code: l.item_code || '',
        item_name: l.item_name || 'Item',
        physical_quantity: l.physical_quantity,
        system_quantity: l.system_quantity,
        variance: l.variance,
      }));
      setLines(mappedLines);
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

  const getBranchName = (id: number) => {
    return branches?.find((b) => b.branch_id === id)?.name || `Cabang #${id}`;
  };

  const getCategoryName = (id: number) => {
    return categories?.find((c) => c.category_id === id)?.name || `Kategori #${id}`;
  };

  const handleQtyChange = (lineId: number, val: number) => {
    setLines((prev) =>
      prev.map((l) => (l.line_id === lineId ? { ...l, physical_quantity: Math.max(0, val) } : l))
    );
  };

  const handleItemSearchSelect = (selectedItem: any) => {
    // If the searched item exists in our opname list, filter the view to focus on it
    const match = lines.find((l) => l.item_id === selectedItem.item_id);
    if (match) {
      setFilterItemId(selectedItem.item_id);
      setActionError(null);
    } else {
      setActionError(`Item '${selectedItem.name}' tidak terdaftar dalam kategori opname ini.`);
    }
  };

  const handleSaveDraft = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      const payload = {
        notes: notes || null,
        lines: lines.map((l) => ({
          line_id: l.line_id,
          item_id: l.item_id,
          physical_quantity: l.physical_quantity,
        })),
      };
      await updateOpname.mutateAsync(payload);
      setActionSuccess('Draft fisik opname berhasil disimpan!');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (err: any) {
      console.error(err);
      setActionError(err.response?.data?.detail || 'Gagal menyimpan draft opname');
    }
  };

  const handleCompleteSubmit = async () => {
    setActionError(null);
    setActionSuccess(null);
    try {
      // 1. Save current counts first to be absolutely safe
      const payload = {
        notes: notes || null,
        lines: lines.map((l) => ({
          line_id: l.line_id,
          item_id: l.item_id,
          physical_quantity: l.physical_quantity,
        })),
      };
      await updateOpname.mutateAsync(payload);

      // 2. Complete session
      await completeOpname.mutateAsync(sessionID);
      setConfirmOpen(false);
      setActionSuccess('Sesi opname stok berhasil diselesaikan!');
      setTimeout(() => {
        navigate('/operations/stock-opname');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setConfirmOpen(false);
      setActionError(err.response?.data?.detail || 'Gagal menyelesaikan opname stok');
    }
  };

  const getStatusBadge = (status: string) => {
    if (status === 'draft') {
      return (
        <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-450 text-blue-450 text-blue-400 border border-blue-500/20">
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

  const filteredLines = filterItemId 
    ? lines.filter((l) => l.item_id === filterItemId) 
    : lines;

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
        {/* Left Column: Count Entry Sheet / Items List */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Search / Focus - Bento Box */}
          {session.status === 'draft' && (
            <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h3 className="font-semibold text-base text-white flex items-center gap-2">
                  <Search className="h-5 w-5 text-amber-500" />
                  Cari & Fokus Item
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
              <ItemSearch onSelect={handleItemSearchSelect} clearOnSelect={true} />
            </div>
          )}

          {/* Counts Card - Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4 min-h-[300px]">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3 flex justify-between items-center">
              <span>Baris Opname ({lines.length} items)</span>
              {filterItemId && <span className="text-xs text-amber-500">Hasil Filter</span>}
            </h3>

            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {filteredLines.map((line) => {
                  const isCompleted = session.status === 'completed';
                  const showVariance = isCompleted && line.variance !== undefined;
                  
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

                      {/* Count Entry Fields */}
                      <div className="flex items-center gap-6 justify-between sm:justify-end">
                        {/* System Qty (Visible on complete or for comparison) */}
                        {isCompleted && (
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 block">Sistem</span>
                            <span className="text-sm font-bold text-white font-mono">{line.system_quantity} pcs</span>
                          </div>
                        )}

                        {/* Physical count */}
                        <div className="flex items-center gap-2">
                          {isCompleted ? (
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 block">Fisik</span>
                              <span className="text-sm font-bold text-white font-mono">{line.physical_quantity} pcs</span>
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
                                
                                <label htmlFor={`physical_qty_${line.line_id}`} className="sr-only">Jumlah Fisik {line.item_name}</label>
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

                        {/* Variance badge */}
                        {showVariance && (
                          <div className="text-right min-w-[70px]">
                            <span className="text-[10px] text-slate-500 block">Selisih</span>
                            <span className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                              line.variance === 0 
                                ? 'text-slate-400 bg-slate-800' 
                                : line.variance && line.variance > 0 
                                ? 'text-emerald-400 bg-emerald-500/10'
                                : 'text-red-400 bg-red-500/10'
                            }`}>
                              {line.variance && line.variance > 0 ? `+${line.variance}` : line.variance}
                            </span>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Right Column: Controls & Metadata */}
        <div className="space-y-6">
          {/* Metadata Panel - Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3 flex justify-between items-center">
              <span>Detail Sesi</span>
              {getStatusBadge(session.status)}
            </h3>

            {/* Session general details */}
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
                {session.status === 'draft' ? (
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
                  <p className="text-slate-400 bg-slate-900/50 p-2.5 rounded-lg border border-slate-850/50">{session.notes || 'Tidak ada catatan'}</p>
                )}
              </div>
            </div>

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

            {/* Operational draft buttons */}
            {session.status === 'draft' && (
              <div className="space-y-3 pt-2">
                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={handleSaveDraft}
                    disabled={updateOpname.isPending}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white border border-slate-800 font-semibold rounded-xl min-h-[44px] shadow-sm flex items-center justify-center gap-2"
                  >
                    <Save className="h-4 w-4" /> Simpan Draft
                  </Button>
                </motion.div>

                <motion.div whileTap={{ scale: 0.97 }}>
                  <Button
                    onClick={() => setConfirmOpen(true)}
                    className="w-full bg-gradient-to-r from-emerald-500 to-emerald-600 hover:opacity-90 border-0 text-white font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                  >
                    Selesaikan Opname
                  </Button>
                </motion.div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Irreversible Warning Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white rounded-xl">
          <DialogHeader className="flex flex-col items-center text-center">
            <AlertTriangle className="h-10 w-10 text-red-500 mb-2 animate-bounce" />
            <DialogTitle className="text-white text-lg">Selesaikan Sesi Opname Stok?</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs mt-1">
              Peringatan: Tindakan ini **bersifat final dan tidak dapat diubah**. Sistem akan langsung membandingkan jumlah fisik dengan database, menghitung selisih (variance), dan **menyesuaikan saldo kartu stok gudang secara otomatis** melalui jurnal koreksi.
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
              onClick={handleCompleteSubmit}
              disabled={completeOpname.isPending}
              className="bg-red-550 hover:bg-red-650 border-0 text-white font-semibold rounded-lg w-full sm:w-auto"
            >
              {completeOpname.isPending ? 'Memproses...' : 'Ya, Selesaikan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
