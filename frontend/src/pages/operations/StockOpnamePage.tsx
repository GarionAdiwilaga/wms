import { useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { useCategories } from '../../hooks/useCategories';
import { useStockOpnameSessions, useCreateStockOpname } from '../../hooks/useStockOpname';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../../components/ui/dialog';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { ClipboardList, Plus, Calendar, ShieldCheck, Play, HelpCircle } from 'lucide-react';

export function StockOpnamePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  const { data: branches } = useBranches();
  const { data: categories } = useCategories();
  
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [branchFilter, setBranchFilter] = useState<string>('');
  const [page, setPage] = useState(1);

  const activeBranchId = user?.role === 'super_admin' ? (branchFilter ? Number(branchFilter) : null) : user?.branch_id;

  const { data: opnamesResponse, isLoading } = useStockOpnameSessions({
    branch_id: activeBranchId,
    status: statusFilter || null,
    page,
    page_size: 10,
  });

  const createOpname = useCreateStockOpname();

  // Create Modal State
  const [createOpen, setCreateOpen] = useState(false);
  const [opnameBranchId, setOpnameBranchId] = useState<number | null>(null);
  const [opnameCategoryId, setOpnameCategoryId] = useState<number | null>(null);
  const [opnameNotes, setOpnameNotes] = useState('');
  const [modalError, setModalError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(false);

  // Set default branch for Branch Head / Staff
  const handleOpenCreate = () => {
    setModalError(null);
    setOpnameNotes('');
    setOpnameCategoryId(null);
    if (user && user.role !== 'super_admin') {
      setOpnameBranchId(user.branch_id);
    } else {
      setOpnameBranchId(null);
    }
    setCreateOpen(true);
  };

  const handleStartOpname = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    const activeSourceId = user?.role === 'super_admin' ? opnameBranchId : user?.branch_id;
    if (!activeSourceId) {
      setModalError('Cabang wajib ditentukan');
      return;
    }

    if (!opnameCategoryId) {
      setModalError('Kategori item wajib dipilih');
      return;
    }

    setIsInitializing(true);
    try {
      // 1. Fetch all items in the selected category
      const itemsResp = await api.get('/items/', {
        params: { category_id: opnameCategoryId, page_size: 100 }
      });
      const categoryItems = itemsResp.data?.data || [];

      if (categoryItems.length === 0) {
        setModalError('Kategori yang dipilih tidak memiliki item aktif. Tambahkan item ke kategori ini terlebih dahulu.');
        setIsInitializing(false);
        return;
      }

      // 2. Prepare lines with default physical count = 0
      const payload = {
        branch_id: activeSourceId,
        category_id: opnameCategoryId,
        status: 'draft' as const,
        notes: opnameNotes || null,
        lines: categoryItems.map((item: any) => ({
          item_id: item.item_id,
          physical_quantity: 0,
        })),
      };

      // 3. Post to create stock opname session
      const newSession = await createOpname.mutateAsync(payload);
      setCreateOpen(false);
      navigate(`/operations/stock-opname/${newSession.session_id}`);
    } catch (err: any) {
      console.error(err);
      setModalError(err.response?.data?.detail || 'Gagal memulai sesi opname stok');
    } finally {
      setIsInitializing(false);
    }
  };

  const getBranchName = (id: number) => {
    return branches?.find((b) => b.branch_id === id)?.name || `Cabang #${id}`;
  };

  const getCategoryName = (id: number) => {
    return categories?.find((c) => c.category_id === id)?.name || `Kategori #${id}`;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-450 text-blue-450 text-blue-450 text-blue-400 border border-blue-500/20">
            <HelpCircle className="h-3 w-3" /> Draft
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <ShieldCheck className="h-3 w-3" /> Selesai
          </span>
        );
      default:
        return (
          <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-450">
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
          title="Opname Stok"
          description="Lakukan pencocokan berkala stock fisik di gudang dengan catatan sistem."
        />
        <motion.div whileTap={{ scale: 0.97 }} className="self-start sm:self-auto">
          <Button
            onClick={handleOpenCreate}
            className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px] shadow-md flex items-center gap-2"
          >
            <Plus className="h-5 w-5" /> Sesi Opname Baru
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
            <option value="completed">Selesai</option>
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
      ) : !opnamesResponse || opnamesResponse.data.length === 0 ? (
        <EmptyState
          title="Tidak ada sesi opname stok"
          description="Mulai opname stok baru untuk melakukan audit fisik komponen di gudang."
        />
      ) : (
        <div className="space-y-4">
          <AnimatePresence initial={false}>
            {opnamesResponse.data.map((opname, idx) => (
              <motion.div
                key={opname.session_id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25, delay: idx * 0.05 }}
                className="bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-slate-800 transition-all cursor-pointer"
                onClick={() => navigate(`/operations/stock-opname/${opname.session_id}`)}
              >
                {/* Info block */}
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="font-bold text-white text-sm">
                      Sesi Opname #{opname.session_id}
                    </h3>
                    {getStatusBadge(opname.status)}
                  </div>

                  <div className="text-sm font-semibold text-slate-300">
                    Kategori: <span className="text-amber-500">{getCategoryName(opname.category_id)}</span>
                    <span className="text-slate-500 font-medium"> | {getBranchName(opname.branch_id)}</span>
                  </div>

                  <div className="flex items-center gap-4 text-xs text-slate-450">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-650" />
                      {formatDate(opname.created_at)}
                    </span>
                    <span>•</span>
                    <span>Item: {opname.lines.length} jenis</span>
                  </div>
                </div>

                {/* Action Trigger */}
                <div className="flex items-center justify-end gap-3 self-end sm:self-auto">
                  <motion.div whileTap={{ scale: 0.95 }}>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="border border-slate-800 text-slate-300 hover:text-white rounded-lg px-4 h-9"
                    >
                      {opname.status === 'draft' ? 'Lanjutkan Count' : 'Lihat Hasil'}
                    </Button>
                  </motion.div>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Pagination */}
          {opnamesResponse.total_pages > 1 && (
            <div className="flex justify-center items-center gap-4 pt-4">
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="rounded-lg border-slate-800 hover:bg-slate-800 text-white min-h-[38px] px-3 disabled:opacity-50"
                >
                  Sebelumnya
                </Button>
              </motion.div>
              <span className="text-sm text-slate-400 font-medium">
                Halaman {page} dari {opnamesResponse.total_pages}
              </span>
              <motion.div whileTap={{ scale: 0.95 }}>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= opnamesResponse.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-lg border-slate-800 hover:bg-slate-800 text-white min-h-[38px] px-3 disabled:opacity-50"
                >
                  Selanjutnya
                </Button>
              </motion.div>
            </div>
          )}
        </div>
      )}

      {/* Start Opname Session Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-[425px] bg-slate-900 border-slate-800 text-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <ClipboardList className="h-5 w-5 text-amber-500" />
              Mulai Opname Stok Baru
            </DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Pilih cabang dan kategori. Sistem akan mengambil snapshot database stock saat ini untuk seluruh item di kategori tersebut.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleStartOpname} className="space-y-4 pt-2">
            {/* Branch Selection */}
            <div className="space-y-2">
              {isSuperAdmin ? (
                <>
                  <Label htmlFor="opname_branch">Gudang Cabang</Label>
                  <select
                    id="opname_branch"
                    name="opname_branch_id"
                    value={opnameBranchId || ''}
                    onChange={(e) => setOpnameBranchId(Number(e.target.value) || null)}
                    className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm"
                    required
                  >
                    <option value="">Pilih Gudang...</option>
                    {branches?.filter(b => b.is_active).map((b) => (
                      <option key={b.branch_id} value={b.branch_id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <>
                  <Label>Gudang Cabang</Label>
                  <div className="h-10 px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-sm text-slate-350 flex items-center font-medium">
                    {getBranchName(user?.branch_id || 0)}
                  </div>
                </>
              )}
            </div>

            {/* Category Selection */}
            <div className="space-y-2">
              <Label htmlFor="opname_category">Kategori Barang</Label>
              <select
                id="opname_category"
                name="opname_category_id"
                value={opnameCategoryId || ''}
                onChange={(e) => setOpnameCategoryId(Number(e.target.value) || null)}
                className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm"
                required
              >
                <option value="">Pilih Kategori...</option>
                {categories?.filter(c => c.is_active).map((c) => (
                  <option key={c.category_id} value={c.category_id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="opname_notes">Catatan/Keterangan (Opsional)</Label>
              <textarea
                id="opname_notes"
                name="opname_notes"
                placeholder="Contoh: Audit stok pertengahan tahun, opname berkala bulanan..."
                value={opnameNotes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setOpnameNotes(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm resize-none"
              />
            </div>

            {modalError && (
              <div className="text-xs bg-red-500/10 border border-red-500/20 text-red-400 p-2.5 rounded-lg font-medium break-words">
                {modalError}
              </div>
            )}

            <DialogFooter className="gap-2 sm:gap-0 pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setCreateOpen(false)}
                className="border border-slate-850 text-slate-400 hover:text-white rounded-lg w-full sm:w-auto"
                disabled={isInitializing}
              >
                Kembali
              </Button>
              <Button
                type="submit"
                disabled={isInitializing}
                className="bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-lg w-full sm:w-auto flex items-center justify-center gap-2"
              >
                <Play className="h-4 w-4" /> {isInitializing ? 'Memproses...' : 'Mulai Opname'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
