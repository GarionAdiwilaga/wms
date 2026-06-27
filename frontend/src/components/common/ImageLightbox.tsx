import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ZoomIn } from "lucide-react";
import { createPortal } from "react-dom";

interface ImageLightboxProps {
  src: string | null;
  alt: string;
  triggerClassName?: string;
  children?: React.ReactNode;
}

export function ImageLightbox({ src, alt, triggerClassName, children }: ImageLightboxProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!src) {
    return <>{children}</>;
  }

  return (
    <>
      <div 
        className={`relative group cursor-pointer ${triggerClassName || ""}`}
        onClick={() => setIsOpen(true)}
      >
        {children}
        <div className="absolute inset-0 bg-slate-900/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-inherit">
          <ZoomIn className="h-6 w-6 text-white" />
        </div>
      </div>

      {createPortal(
        <AnimatePresence>
          {isOpen && (
            <div className="fixed inset-0 z-50 flex items-center justify-center">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsOpen(false)}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ type: "spring", damping: 25, stiffness: 300 }}
                className="relative z-10 max-w-[90vw] max-h-[90vh]"
              >
                <img
                  src={src}
                  alt={alt}
                  className="w-auto h-auto max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl border border-slate-800 bg-slate-900"
                />
                <button
                  onClick={() => setIsOpen(false)}
                  className="absolute -top-4 -right-4 p-2 bg-slate-800 text-slate-400 hover:text-white rounded-full border border-slate-700 shadow-lg"
                >
                  <X className="h-5 w-5" />
                </button>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}
    </>
  );
}
