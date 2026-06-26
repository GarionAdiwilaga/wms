import { useEffect, useState, ChangeEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useStockInCartStore } from '../../store/stock-in-cart-store';
import { useBranches } from '../../hooks/useBranches';
import { useCreateStockIn } from '../../hooks/useStockIn';
import { ItemSearch } from '../../components/common/ItemSearch';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Plus, Minus, ArrowLeft, Archive, Image as ImageIcon, Calendar } from 'lucide-react';

export function StockInPage() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  
  const {
    branchId,
    referenceNo,
    supplierInvoiceNo,
    transactionDate,
    notes,
    items,
    setBranchId,
    setFields,
    addItem,
    removeItem,
    updateQuantity,
    clearCart
  } = useStockInCartStore();

  const { data: branches } = useBranches();
  const createStockIn = useCreateStockIn();

  const [formError, setFormError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Set default branch for branch staff on mount
  useEffect(() => {
    if (user && user.role !== 'super_admin' && !branchId) {
      setBranchId(user.branch_id);
    }
  }, [user, branchId, setBranchId]);

  const handleItemSelect = (selectedItem: any) => {
    addItem(selectedItem);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMsg(null);

    const activeBranchId = user?.role === 'super_admin' ? branchId : user?.branch_id;
    if (!activeBranchId) {
      setFormError('Cabang wajib dipilih');
      return;
    }

    if (items.length === 0) {
      setFormError('Keranjang stok masuk masih kosong');
      return;
    }

    try {
      const payload = {
        branch_id: activeBranchId,
        reference_no: referenceNo || null,
        supplier_invoice_no: supplierInvoiceNo || null,
        transaction_date: transactionDate ? new Date(transactionDate).toISOString() : null,
        notes: notes || null,
        lines: items.map((i) => ({
          item_id: i.item_id,
          quantity: i.quantity,
        })),
      };

      await createStockIn.mutateAsync(payload);
      setSuccessMsg('Stok masuk berhasil disimpan!');
      clearCart();
      setTimeout(() => {
        navigate('/operations/history?tab=stock-in');
      }, 1500);
    } catch (err: any) {
      console.error(err);
      setFormError(err.response?.data?.detail || 'Gagal menyimpan transaksi stok masuk');
    }
  };

  const isSuperAdmin = user?.role === 'super_admin';
  const selectedBranchName = branches?.find(b => b.branch_id === (isSuperAdmin ? branchId : user?.branch_id))?.name || 'Cabang';

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
          title="Stok Masuk Baru"
          description="Pencatatan komponen masuk dari supplier ke gudang cabang."
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* Left Column: Selector & Cart Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* Item Search Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white flex items-center gap-2">
              <Archive className="h-5 w-5 text-amber-500" />
              Pilih Barang
            </h3>
            <ItemSearch
              onSelect={handleItemSelect}
              clearOnSelect={true}
              branchId={user?.role === 'super_admin' ? (branchId ?? null) : (user?.branch_id ?? null)}
            />
          </div>

          {/* Cart List Bento Box */}
          <div className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4 min-h-[300px]">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-semibold text-lg text-white">
                Daftar Barang ({items.reduce((sum, i) => sum + i.quantity, 0)} pcs)
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
                <Archive className="h-12 w-12 mb-3 text-slate-700" />
                <p className="text-sm">Belum ada barang di dalam keranjang.</p>
                <p className="text-xs mt-1">Gunakan kotak pencarian di atas untuk memasukkan barang.</p>
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
                              onClick={() => updateQuantity(item.item_id, item.quantity - 1)}
                              className="h-8 w-8 text-slate-400 hover:text-white rounded-md"
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </motion.div>
                          
                          <label htmlFor={`qty-${item.item_id}`} className="sr-only">Jumlah {item.name}</label>
                          <input
                            id={`qty-${item.item_id}`}
                            name={`qty-${item.item_id}`}
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
                  ))}
                </AnimatePresence>
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Transaction Metadata Form */}
        <div className="space-y-6">
          <form onSubmit={handleSave} className="bg-card border border-border rounded-xl p-5 shadow-lg space-y-4">
            <h3 className="font-semibold text-lg text-white border-b border-slate-800 pb-3">
              Info Checkout
            </h3>

            {/* Branch display or select */}
            <div className="space-y-2">
              <Label htmlFor="branch_select">Gudang Tujuan</Label>
              {isSuperAdmin ? (
                <select
                  id="branch_select"
                  name="branch_id"
                  value={branchId || ''}
                  onChange={(e) => setBranchId(Number(e.target.value) || null)}
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
              <Label htmlFor="reference_no">No. Referensi (Opsional)</Label>
              <Input
                id="reference_no"
                name="reference_no"
                type="text"
                placeholder="Contoh: PO-2026-0001"
                value={referenceNo}
                onChange={(e) => setFields({ referenceNo: e.target.value })}
                className="bg-slate-950 border-slate-850 text-white rounded-lg focus-visible:ring-primary"
              />
            </div>

            {/* Supplier Invoice No */}
            <div className="space-y-2">
              <Label htmlFor="supplier_invoice_no">No. Invoice Supplier (Opsional)</Label>
              <Input
                id="supplier_invoice_no"
                name="supplier_invoice_no"
                type="text"
                placeholder="Contoh: INV/Supplier/XYZ-99"
                value={supplierInvoiceNo}
                onChange={(e) => setFields({ supplierInvoiceNo: e.target.value })}
                className="bg-slate-950 border-slate-850 text-white rounded-lg focus-visible:ring-primary"
              />
            </div>

            {/* Transaction Date */}
            <div className="space-y-2">
              <Label htmlFor="transaction_date">Tanggal Transaksi (Opsional)</Label>
              <div className="relative flex items-center">
                <Calendar className="absolute left-3 h-4 w-4 text-slate-400 pointer-events-none" />
                <Input
                  id="transaction_date"
                  name="transaction_date"
                  type="datetime-local"
                  value={transactionDate}
                  onChange={(e) => setFields({ transactionDate: e.target.value })}
                  className="pl-10 bg-slate-950 border-slate-850 text-white rounded-lg focus-visible:ring-primary"
                />
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                Biarkan kosong untuk otomatis mencatat waktu saat ini.
              </p>
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Catatan Tambahan (Opsional)</Label>
              <textarea
                id="notes"
                name="notes"
                placeholder="Keterangan pengiriman, kondisi barang, dll."
                value={notes}
                onChange={(e: ChangeEvent<HTMLTextAreaElement>) => setFields({ notes: e.target.value })}
                rows={3}
                className="w-full px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent shadow-sm resize-none"
              />
            </div>

            {formError && (
              <div className="text-sm bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg">
                {formError}
              </div>
            )}

            {successMsg && (
              <div className="text-sm bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-3 rounded-lg">
                {successMsg}
              </div>
            )}

            {/* Action Buttons */}
            <div className="pt-2">
              <motion.div whileTap={{ scale: 0.97 }}>
                <Button
                  type="submit"
                  disabled={createStockIn.isPending}
                  className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px] shadow-md flex items-center justify-center gap-2"
                >
                  {createStockIn.isPending ? 'Menyimpan...' : 'Simpan Transaksi'}
                </Button>
              </motion.div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
