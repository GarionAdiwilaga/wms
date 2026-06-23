import { useEffect, useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useCartStore } from '../../store/cart-store';
import { useBranches } from '../../hooks/useBranches';
import { useCreateOutbound } from '../../hooks/useOutbound';
import { ItemSearch } from '../../components/common/ItemSearch';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { api } from '../../lib/api';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingCart, Image as ImageIcon } from 'lucide-react';

export function OutboundPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const {
    branchId,
    referenceNo,
    notes,
    items,
    setBranchId,
    setReferenceNo,
    setNotes,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
  } = useCartStore();

  const { data: branches } = useBranches();
  const createOutbound = useCreateOutbound();

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isCheckingStock, setIsCheckingStock] = useState(false);

  // Set default branch for branch staff on mount
  useEffect(() => {
    if (user && user.role !== 'super_admin' && !branchId) {
      setBranchId(user.branch_id);
    }
  }, [user, branchId, setBranchId]);

  const handleItemSelect = async (selectedItem: any) => {
    setFormError(null);
    const activeBranchId = user?.role === 'super_admin' ? branchId : user?.branch_id;
    if (!activeBranchId) {
      setFormError('Cabang wajib dipilih sebelum memilih barang');
      return;
    }

    setIsCheckingStock(true);
    try {
      // Fetch latest stock balance from branch stocks
      const resp = await api.get('/branch-stocks/', {
        params: { branch_id: activeBranchId, search: selectedItem.item_code },
      });
      const matchedStock = resp.data?.data?.find((bs: any) => bs.item_id === selectedItem.item_id);
      const availableStock = matchedStock ? matchedStock.quantity : 0;

      addItem(selectedItem, availableStock);
    } catch (err: any) {
      console.error('Failed to verify branch stock levels:', err);
      // Fallback to 0 if call fails
      addItem(selectedItem, 0);
    } finally {
      setIsCheckingStock(false);
    }
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const activeBranchId = user?.role === 'super_admin' ? branchId : user?.branch_id;
    if (!activeBranchId) {
      setFormError('Cabang wajib dipilih');
      return;
    }

    if (!referenceNo.trim()) {
      setFormError('Nomor referensi wajib diisi');
      return;
    }

    if (items.length === 0) {
      setFormError('Keranjang belanja masih kosong');
      return;
    }

    // Double check that we have sufficient stock for all items
    const insufficientItems = items.filter((i) => i.quantity > i.available_stock);
    if (insufficientItems.length > 0) {
      setFormError('Beberapa barang tidak memiliki stok yang cukup untuk checkout');
      return;
    }

    try {
      const payload = {
        branch_id: activeBranchId,
        reference_no: referenceNo,
        notes: notes || null,
        lines: items.map((i) => ({
          item_id: i.item_id,
          quantity: i.quantity,
        })),
      };

      await createOutbound.mutateAsync(payload);
      setSuccessMsg('Barang keluar berhasil dicheckout!');
      clearCart();
      setTimeout(() => {
        navigate('/operations/history?tab=outbound');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      // Explicitly catch and render backend 400 insufficient stock error details
      const detailError = err.response?.data?.detail || 'Gagal melakukan checkout barang keluar';
      setFormError(typeof detailError === 'string' ? detailError : JSON.stringify(detailError));
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const selectedBranchName = branches?.find(b => b.branch_id === (isSuperAdmin ? branchId : user?.branch_id))?.name || 'Cabang';

  // Check if any cart item exceeds available stock
  const hasStockViolations = items.some((i) => i.quantity > i.available_stock);

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
          title="Checkout Barang Keluar"
          description="Deduction of components for customer orders, custom trophies, or projects."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Selector & Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Search Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-amber-500" />
              Cari & Tambah Barang
            </h3>
            <ItemSearch onSelect={handleItemSelect} clearOnSelect={true} />
            {isCheckingStock && <p className="text-xs text-amber-500 animate-pulse">Menghitung stok cabang...</p>}
          </div>

          {/* Cart List Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4 min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-lg text-white">
                Keranjang Outbound ({items.reduce((sum, i) => sum + i.quantity, 0)} pcs)
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
                <ShoppingCart className="h-12 w-12 mb-3 text-slate-700" />
                <p className="text-sm">Keranjang outbound Anda kosong.</p>
                <p className="text-xs mt-1">Cari dan pilih komponen trophy di atas untuk memulai checkout.</p>
              </div>
            ) : (
              <div className="space-y-1">
                <AnimatePresence initial={false}>
                  {items.map((item) => {
                    const isInsufficient = item.quantity > item.available_stock;
                    
                    return (
                      <motion.div
                        layout
                        key={item.item_id}
                        initial={{ opacity: 0, height: 0, y: -20 }}
                        animate={{ opacity: 1, height: 'auto', y: 0 }}
                        exit={{ opacity: 0, height: 0, y: 20 }}
                        transition={{ type: 'spring', stiffness: 350, damping: 25 }}
                        className={`overflow-hidden border rounded-xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 mb-3 transition-colors ${
                          isInsufficient 
                            ? 'border-red-500/30 bg-red-500/5' 
                            : 'border-border bg-slate-900/40'
                        }`}
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
                            <div className="flex flex-wrap items-center gap-2 mt-0.5">
                              <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 border border-slate-700 text-amber-500 font-mono">
                                {item.item_code}
                              </span>
                              <span className={`text-xs font-semibold ${isInsufficient ? 'text-red-400' : 'text-slate-400'}`}>
                                Tersedia: {item.available_stock} pcs
                              </span>
                            </div>
                            {isInsufficient && (
                              <p className="text-xs text-red-400 font-medium mt-1">
                                Stok tidak mencukupi! Kurangi jumlah checkout.
                              </p>
                            )}
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
                                onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                                className="h-8 w-8 text-slate-400 hover:text-white rounded-md"
                                disabled={item.quantity <= 1}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                            </motion.div>
                            
                            <input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(item.item_id, parseInt(e.target.value) || 1)}
                              className="bg-transparent text-white w-12 text-center text-sm font-bold focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                            />

                            <motion.div whileTap={{ scale: 0.85 }}>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => updateQuantity(item.item_id, item.quantity + 1)}
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
                    );
                  })}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Checkout Info Form */}
        <div className="space-y-6">
          <form onSubmit={handleCheckout} className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3">
              Checkout Info
            </h3>

            {/* Branch display or select */}
            <div className="space-y-2">
              <Label>Gudang Asal</Label>
              {isSuperAdmin ? (
                <select
                  value={branchId || ''}
                  onChange={(e) => {
                    setBranchId(Number(e.target.value) || null);
                    clearCart(); // Clear cart items if branch changes to avoid mixed stock calculations
                  }}
                  className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm"
                >
                  <option value="">Pilih Gudang Cabang...</option>
                  {branches?.filter(b => b.is_active).map((b) => (
                    <option key={b.branch_id} value={b.branch_id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="h-10 px-3 py-2 bg-slate-900 border border-slate-850 rounded-lg text-sm text-slate-300 flex items-center font-medium">
                  {selectedBranchName}
                </div>
              )}
            </div>

            {/* Reference No */}
            <div className="space-y-2">
              <Label htmlFor="reference_no" className="after:content-['*'] after:text-red-500 after:ml-0.5">
                No. Referensi (Invoice/SPK)
              </Label>
              <Input
                id="reference_no"
                type="text"
                placeholder="Masukkan No. Invoice / Order"
                value={referenceNo}
                onChange={(e) => setReferenceNo(e.target.value)}
                className="bg-slate-950 border-slate-850 text-white rounded-lg focus-visible:ring-primary"
                required
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Transaksi (Opsional)</Label>
              <textarea
                id="notes"
                placeholder="Tuliskan nama customer, detail trophy, atau keterangan lainnya..."
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

            {/* Checkout Action Button */}
            <div className="pt-2">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  disabled={createOutbound.isPending || hasStockViolations || items.length === 0}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2 disabled:from-slate-800 disabled:to-slate-900 disabled:text-slate-500"
                >
                  {createOutbound.isPending ? 'Memproses Checkout...' : 'Checkout Barang Keluar'}
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
