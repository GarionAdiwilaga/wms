import { QRCodeSVG } from 'qrcode.react';
import { Printer } from 'lucide-react';
import { Item } from '../../../hooks/useItems';
import { Button } from '../../../components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../../../components/ui/dialog';
import { motion } from 'framer-motion';

interface QRViewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: Item | null;
}

export function QRViewDialog({ open, onOpenChange, item }: QRViewDialogProps) {
  if (!item) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Cetak QR Label</DialogTitle>
        </DialogHeader>

        {/* CSS for print isolation */}
        <style dangerouslySetInnerHTML={{ __html: `
          @media print {
            /* Hide everything else on the screen */
            body * {
              visibility: hidden !important;
            }
            /* Show only the printable label area */
            #printable-qr-label, #printable-qr-label * {
              visibility: visible !important;
            }
            #printable-qr-label {
              position: fixed !important;
              left: 0 !important;
              top: 0 !important;
              width: 100vw !important;
              height: 100vh !important;
              display: flex !important;
              flex-direction: column !important;
              align-items: center !important;
              justify-content: center !important;
              background: white !important;
              color: black !important;
              padding: 20px !important;
              margin: 0 !important;
              box-sizing: border-box !important;
            }
            /* Adjust QR colors for print */
            #printable-qr-label svg {
              width: 200px !important;
              height: 200px !important;
            }
            #printable-qr-label .print-border {
              border: 2px solid black !important;
              padding: 20px !important;
              border-radius: 8px !important;
              text-align: center !important;
            }
            #printable-qr-label .print-text-color {
              color: black !important;
            }
          }
        `}} />

        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {/* Printable Area */}
          <div id="printable-qr-label" className="bg-slate-950 border border-slate-850 p-6 rounded-lg text-center w-full max-w-[280px]">
            <div className="print-border flex flex-col items-center justify-center space-y-4">
              {/* QR Code SVG */}
              <div className="bg-white p-3 rounded flex items-center justify-center">
                <QRCodeSVG
                  value={item.item_code}
                  size={160}
                  level="H"
                  bgColor="#FFFFFF"
                  fgColor="#000000"
                  includeMargin={false}
                />
              </div>

              {/* Label details */}
              <div className="space-y-1">
                <h4 className="font-mono font-bold text-lg text-amber-500 print-text-color tracking-wider">
                  {item.item_code}
                </h4>
                <p className="text-sm font-semibold text-white print-text-color line-clamp-2">
                  {item.name}
                </p>
                <p className="text-xs text-slate-400 print-text-color">
                  Merk: {item.supplier?.name || '-'}
                </p>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex w-full gap-3 pt-4 border-t border-slate-800">
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="w-full border-slate-700 bg-transparent hover:bg-slate-800 text-white rounded-xl min-h-[44px]"
              >
                Tutup
              </Button>
            </motion.div>
            <motion.div whileTap={{ scale: 0.97 }} className="flex-1">
              <Button
                type="button"
                onClick={handlePrint}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px]"
              >
                <Printer className="mr-2 h-4 w-4" />
                Cetak Label
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
