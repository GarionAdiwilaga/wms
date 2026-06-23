import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface TransferCartItem {
  item_id: number;
  item_code: string;
  name: string;
  sent_quantity: number;
  image_url: string | null;
  supplier_name?: string;
  category_name?: string;
}

interface TransferState {
  sourceBranchId: number | null;
  destBranchId: number | null;
  notes: string;
  items: TransferCartItem[];
  setSourceBranchId: (branchId: number | null) => void;
  setDestBranchId: (branchId: number | null) => void;
  setNotes: (notes: string) => void;
  addItem: (item: any) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, sent_quantity: number) => void;
  clearCart: () => void;
}

export const useTransferCartStore = create<TransferState>()(
  persist(
    (set) => ({
      sourceBranchId: null,
      destBranchId: null,
      notes: '',
      items: [],
      setSourceBranchId: (sourceBranchId) => set({ sourceBranchId }),
      setDestBranchId: (destBranchId) => set({ destBranchId }),
      setNotes: (notes) => set({ notes }),
      addItem: (item) =>
        set((state) => {
          const existing = state.items.find((i) => i.item_id === item.item_id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.item_id === item.item_id ? { ...i, sent_quantity: i.sent_quantity + 1 } : i
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
                sent_quantity: 1,
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
      updateQuantity: (itemId, sent_quantity) =>
        set((state) => ({
          items: state.items.map((i) =>
            i.item_id === itemId ? { ...i, sent_quantity: Math.max(1, sent_quantity) } : i
          ),
        })),
      clearCart: () =>
        set({
          notes: '',
          items: [],
        }),
    }),
    {
      name: 'transfer-cart-storage',
    }
  )
);
