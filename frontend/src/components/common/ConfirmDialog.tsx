import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Button } from "../ui/button";
import { motion } from "framer-motion";

interface ConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: "default" | "destructive";
  isLoading?: boolean;
  className?: string;
  children?: React.ReactNode;
}

export function ConfirmDialog({
  open,
  onOpenChange,
  onConfirm,
  title,
  description,
  confirmLabel = "Konfirmasi",
  cancelLabel = "Batal",
  variant = "default",
  isLoading = false,
  className,
  children,
}: ConfirmDialogProps) {
  const isDestructive = variant === "destructive";
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={`bg-slate-900 border-slate-800 ${className || "sm:max-w-[425px]"}`}>
        <DialogHeader>
          <DialogTitle className={isDestructive ? "text-red-500" : "text-white"}>
            {title}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {description}
          </DialogDescription>
        </DialogHeader>
        {children}
        <DialogFooter className="mt-4 gap-2 sm:gap-0 flex-col-reverse sm:flex-row">
          <motion.div whileTap={{ scale: 0.97 }} className="w-full sm:w-auto mt-2 sm:mt-0">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="w-full border-slate-700 hover:bg-slate-800 hover:text-white rounded-xl min-h-[44px]"
            >
              {cancelLabel}
            </Button>
          </motion.div>
          <motion.div whileTap={{ scale: 0.97 }} className="w-full sm:w-auto">
            <Button
              variant={isDestructive ? "destructive" : "default"}
              onClick={onConfirm}
              disabled={isLoading}
              className={`w-full min-h-[44px] rounded-xl ${
                !isDestructive && "bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0"
              }`}
            >
              {isLoading ? "Memproses..." : confirmLabel}
            </Button>
          </motion.div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
