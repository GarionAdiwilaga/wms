import { ConfirmDialog } from './ConfirmDialog';
import { ImageLightbox } from './ImageLightbox';
import { Image as ImageIcon } from 'lucide-react';

interface CartItemSummary {
  item_id: number;
  name: string;
  item_code?: string;
  image_url?: string | null;
  quantity: number;
}

interface CartSummaryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  items: CartItemSummary[];
  onConfirm: () => void;
  isLoading?: boolean;
}

export function CartSummaryDialog({ 
  open, 
  onOpenChange, 
  title, 
  description, 
  items, 
  onConfirm, 
  isLoading 
}: CartSummaryDialogProps) {
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={onOpenChange}
      title={title}
      description={description}
      confirmLabel="Ya, Lanjutkan"
      cancelLabel="Batal"
      isLoading={isLoading}
      onConfirm={onConfirm}
      className="sm:max-w-[520px] max-h-[90vh] flex flex-col"
    >
      <div className="flex-1 overflow-y-auto min-h-0 my-3 space-y-3">
        {items.map((item) => (
          <div key={item.item_id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-slate-800/60 border border-slate-700/50">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-950 overflow-hidden border border-slate-800 flex">
                {item.image_url ? (
                  <ImageLightbox src={item.image_url} alt={item.name} triggerClassName="h-full w-full flex items-center justify-center">
                    <img src={item.image_url} alt={item.name} className="h-full w-full object-cover" />
                  </ImageLightbox>
                ) : (
                  <ImageIcon className="h-5 w-5 text-slate-600" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{item.name}</p>
                <p className="text-[10px] text-slate-500 font-mono">{item.item_code}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0 text-xs font-mono">
              <span className="text-white font-bold">{item.quantity}</span> pcs
            </div>
          </div>
        ))}
      </div>
    </ConfirmDialog>
  );
}
