import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface CartItem {
  item_id: number;
  item_code: string;
  name: string;
  quantity: number;
  available_stock: number;
  image_url: string | null;
  supplier_name?: string;
  category_name?: string;
}

interface CartState {
  branchId: number | null;
  referenceNo: string;
  notes: string;
  items: CartItem[];
  setBranchId: (branchId: number | null) => void;
  setReferenceNo: (referenceNo: string) => void;
  setNotes: (notes: string) => void;
  addItem: (item: any, availableStock: number) => void;
  removeItem: (itemId: number) => void;
  updateQuantity: (itemId: number, quantity: number) => void;
  clearCart: () => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      branchId: null,
      referenceNo: '',
      notes: '',
      items: [],
      setBranchId: (branchId) => set({ branchId }),
      setReferenceNo: (referenceNo) => set({ referenceNo }),
      setNotes: (notes) => set({ notes }),
      addItem: (item, availableStock) =>
        set((state) => {
          const existing = state.items.find((i) => i.item_id === item.item_id);
          if (existing) {
            return {
              items: state.items.map((i) =>
                i.item_id === item.item_id
                  ? { ...i, quantity: i.quantity + 1, available_stock: availableStock }
                  : i
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
                available_stock: availableStock,
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
      clearCart: () => set({ referenceNo: '', notes: '', items: [] }),
    }),
    {
      name: 'outbound-cart-storage',
    }
  )
);
