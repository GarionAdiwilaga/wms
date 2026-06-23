import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface StockInCartItem {
  item_id: number;
  item_code: string;
  name: string;
  quantity: number;
  image_url: string | null;
  supplier_name?: string;
  category_name?: string;
}

interface StockInState {
  branchId: number | null;
  referenceNo: string;
  supplierInvoiceNo: string;
  transactionDate: string; // ISO string format
  notes: string;
  items: StockInCartItem[];
  setBranchId: (branchId: number | null) => void;
  setFields: (fields: Partial<Omit<StockInState, 'items' | 'addItem' | 'removeItem' | 'updateQuantity' | 'clearCart' | 'setFields' | 'setBranchId'>>) => void;
  addItem: (item: any) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
}

export const useStockInCartStore = create<StockInState>()(
  persist(
    (set) => ({
      branchId: null,
      referenceNo: '',
      supplierInvoiceNo: '',
      transactionDate: '',
      notes: '',
      items: [],
      setBranchId: (branchId) => set({ branchId }),
      setFields: (fields) => set((state) => ({ ...state, ...fields })),
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.item_id === item.item_id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.item_id === item.item_id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return {
            items: [
              ...state.items,
              {
                item_id: item.item_id,
                item_code: item.item_code,
                name: item.name,
                quantity: 1,
                image_url: item.image_url,
                supplier_name: item.supplier?.name || item.supplier_name,
                category_name: item.category?.name || item.category_name,
              },
            ],
          };
        }),
      removeItem: (itemId) =>
        set((state) => ({
          items: state.items.filter((i) => i.item_id !== itemId),
        })),
      updateQuantity: (itemId, quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.item_id === itemId ? { ...i, quantity: Math.max(1, quantity) } : i
          ),
        })),
      clearCart: () =>
        set({
          referenceNo: '',
          supplierInvoiceNo: '',
          transactionDate: '',
          notes: '',
          items: [],
        }),
    }),
    {
      name: 'stock-in-cart-storage',
    }
  )
);
