import { useEffect, useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useTransferCartStore } from '../../store/transfer-cart-store';
import { useBranches } from '../../hooks/useBranches';
import { useCreateTransfer } from '../../hooks/useTransfers';
import { ItemSearch } from '../../components/common/ItemSearch';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowLeft, ArrowLeftRight, Image as ImageIcon } from 'lucide-react';

export function TransferCreatePage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  const {
    sourceBranchId,
    destBranchId,
    notes,
    items,
    setSourceBranchId,
    setDestBranchId,
    setNotes,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } = useTransferCartStore();

  const { data: branches } = useBranches();
  const createTransfer = useCreateTransfer();

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Auto-set source branch for Branch Head / Staff on mount
  useEffect(() => {
    if (user && user.role !== 'super_admin' && !sourceBranchId) {
      setSourceBranchId(user.branch_id);
    }
  }, [user, sourceBranchId, setSourceBranchId]);

  const handleItemSelect = (selectedItem: any) => {
    addItem(selectedItem);
  };

  const handleSaveDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const activeSourceId = user?.role === 'super_admin' ? sourceBranchId : user?.branch_id;
    if (!activeSourceId) {
      setFormError('Cabang asal wajib ditentukan');
      return;
    }

    if (!destBranchId) {
      setFormError('Cabang tujuan wajib dipilih');
      return;
    }

    if (activeSourceId === destBranchId) {
      setFormError('Cabang asal dan tujuan tidak boleh sama');
      return;
    }

    if (items.length === 0) {
      setFormError('Mutasi barang membutuhkan minimal 1 item');
      return;
    }

    try {
      const payload = {
        source_branch_id: activeSourceId,
        dest_branch_id: destBranchId,
        notes: notes || null,
        lines: items.map((i) => ({
          item_id: i.item_id,
          sent_quantity: i.sent_quantity,
        })),
      };

      await createTransfer.mutateAsync(payload);
      setSuccessMsg('Draft mutasi barang berhasil disimpan!');
      clearCart();
      setTimeout(() => {
        navigate('/operations/transfers');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Gagal menyimpan draft mutasi');
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const sourceBranchName = branches?.find(b => b.branch_id === (isSuperAdmin ? sourceBranchId : user?.branch_id))?.name || 'Cabang Asal';

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <motion.div whileTap={{ scale: 0.95 }}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-slate-400 hover:text-white rounded-lg h-10 w-10 border border-slate-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </motion.div>
        <PageHeader
          title="Mutasi Baru (Draft)"
          description="Rancang pengiriman stock komponen trophy antar-cabang."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Selector & Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Search Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <ArrowLeftRight className="h-5 w-5 text-amber-500" />
              Pilih Barang Kiriman
            </h3>
            <ItemSearch onSelect={handleItemSelect} clearOnSelect={true} />
          </div>

          {/* Cart List Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4 min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-lg text-white">
                Daftar Barang ({items.reduce((sum, i) => sum + i.sent_quantity, 0)} pcs)
              </h3>
              {items.length > 0 && (
                <motion.div whileTap={{ scale: 0.95 }}>
                  <button
                    type="button"
                    onClick={clearCart}
                    className="text-xs text-red-400 hover:text-red-300 font-medium"
                  >
                    Kosongkan
                  </button>
                </motion.div>
              )}
            </div>

            {items.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
                <ArrowLeftRight className="h-12 w-12 mb-3 text-slate-700" />
                <p className="text-sm">Keranjang transfer barang masih kosong.</p>
                <p className="text-xs mt-1">Cari dan tambahkan barang di atas untuk dikirim.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {items.map((item) => (
                    <motion.div
                      layout
                      key={item.item_id}
                      initial={{ opacity: 0, height: 0, y: -20 }}
                      animate={{ opacity: 1, height: 'auto', y: 0 }}
                      exit={{ opacity: 0, height: 0, y: 20 }}
                      transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                      className="overflow-hidden border border-border bg-slate-900/40 rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-3"
                    >
                      {/* Item Info */}
                      <div className="flex items-center gap-3">
                        <div className="h-12 w-12 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-center overflow-hidden flex-shrink-0">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                          ) : (
                            <ImageIcon className="h-5 w-5 text-slate-600" />
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-amber-500 font-mono">
                              {item.item_code}
                            </span>
                            <span className="text-xs text-slate-400 truncate">
                              Merk: {item.supplier_name || '-'}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Quantity Actions & Delete */}
                      <div className="flex items-center justify-between sm:justify-end gap-6">
                        <div className="flex items-center gap-2 bg-slate-950 border border-slate-800 rounded-lg p-1">
                          <motion.div whileTap={{ scale: 0.85 }}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateQuantity(item.item_id, item.sent_quantity - 1)}
                              className="h-8 w-8 text-slate-400 hover:text-white rounded-md"
                              disabled={item.sent_quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          
                          <label htmlFor={`sent-qty-${item.item_id}`} className="sr-only">Jumlah Kiriman {item.name}</label>
                          <input
                            id={`sent-qty-${item.item_id}`}
                            name={`sent_qty_${item.item_id}`}
                            type="number"
                            value={item.sent_quantity}
                            onChange={(e) => updateQuantity(item.item_id, parseInt(e.target.value) || 1)}
                            className="bg-transparent text-white w-12 text-center text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                          />

                          <motion.div whileTap={{ scale: 0.85 }}>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              onClick={() => updateQuantity(item.item_id, item.sent_quantity + 1)}
                              className="h-8 w-8 text-slate-400 hover:text-white rounded-md"
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </motion.div>
                        </div>

                        <motion.div whileTap={{ scale: 0.9 }}>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.item_id)}
                            className="h-9 w-9 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </motion.div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Routing details */}
        <div className="space-y-6">
          <form onSubmit={handleSaveDraft} className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3">
              Detail Rute Mutasi
            </h3>

            {/* Source Branch */}
            <div className="space-y-2">
              <Label htmlFor="source_branch">Cabang Asal</Label>
              {isSuperAdmin ? (
                <select
                  id="source_branch"
                  name="source_branch_id"
                  value={sourceBranchId || ''}
                  onChange={(e) => setSourceBranchId(Number(e.target.value) || null)}
                  className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm"
                  required
                >
                  <option value="">Pilih Cabang Asal...</option>
                  {branches?.filter(b => b.is_active).map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-10 px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-sm text-slate-300 flex items-center font-medium">
                  {sourceBranchName}
                </div>
              )}
            </div>

            {/* Destination Branch */}
            <div className="space-y-2">
              <Label htmlFor="dest_branch">Cabang Tujuan</Label>
              <select
                id="dest_branch"
                name="dest_branch_id"
                value={destBranchId || ''}
                onChange={(e) => setDestBranchId(Number(e.target.value) || null)}
                className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm"
                required
              >
                <option value="">Pilih Cabang Tujuan...</option>
                {branches?.filter(b => b.is_active && b.branch_id !== (isSuperAdmin ? sourceBranchId : user?.branch_id)).map((b) => (
                  <option key={b.branch_id} value={b.branch_id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Mutasi (Opsional)</Label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Tuliskan keterangan detail pengiriman, kurir, atau alasan mutasi..."
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setNotes(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm resize-none"
              />
            </div>

            {formError && (
              <div className="text-sm bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg font-medium break-words">
                {formError}
              </div>
            )}

            {successMsg && (
              <div className="text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg font-medium">
                {successMsg}
              </div>
            )}

            {/* Submit Action */}
            <div className="pt-2">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  disabled={createTransfer.isPending}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                >
                  {createTransfer.isPending ? 'Menyimpan...' : 'Simpan Draft Mutasi'}
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
