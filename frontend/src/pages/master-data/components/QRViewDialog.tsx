import { QRCodeSVG } from 'qrcode.react';
import { Download } from 'lucide-react';
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

  const handleDownloadImage = () => {
    const svgEl = document.querySelector('#printable-qr-label svg');
    if (!svgEl) {
      console.error('QR SVG element not found in DOM');
      return;
    }

    // Convert SVG to data URL
    const svgString = new XMLSerializer().serializeToString(svgEl);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const URL = window.URL || window.webkitURL || window;
    const blobURL = URL.createObjectURL(svgBlob);

    const canvas = document.createElement('canvas');
    canvas.width = 500;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const img = new Image();
    img.onload = () => {
      // 1. Fill background with white
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, 500, 500);

      // 2. Draw border
      ctx.strokeStyle = '#000000';
      ctx.lineWidth = 6;
      if (ctx.roundRect) {
        ctx.beginPath();
        ctx.roundRect(20, 20, 460, 460, 16);
        ctx.stroke();
      } else {
        ctx.strokeRect(20, 20, 460, 460);
      }

      // 3. Draw QR Image (centered, 240x240 size)
      ctx.drawImage(img, 130, 45, 240, 240);

      // 4. Draw Item Code (centered)
      ctx.fillStyle = '#D97706'; // amber-600
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(item.item_code, 250, 325);

      // 5. Draw Item Name (wrap to max 2 lines)
      ctx.fillStyle = '#000000';
      ctx.font = 'bold 20px sans-serif';
      const maxTextWidth = 420;
      const words = item.name.split(' ');
      let currentLine = '';
      const lines = [];

      for (let i = 0; i < words.length; i++) {
        const testLine = currentLine ? currentLine + ' ' + words[i] : words[i];
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxTextWidth && currentLine) {
          lines.push(currentLine);
          currentLine = words[i];
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        lines.push(currentLine);
      }

      let textY = 365;
      const maxLines = Math.min(lines.length, 2);
      for (let i = 0; i < maxLines; i++) {
        ctx.fillText(lines[i], 250, textY);
        textY += 26;
      }

      // 6. Draw Brand/Supplier (centered)
      ctx.fillStyle = '#475569'; // slate-600
      ctx.font = '16px sans-serif';
      ctx.fillText(`Merk: ${item.supplier?.name || '-'}`, 250, 435);

      // 7. Trigger download
      const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
      const link = document.createElement('a');
      link.download = 'QR_ItemInfo.jpeg';
      link.href = dataUrl;
      link.click();

      // Revoke the blob URL
      URL.revokeObjectURL(blobURL);
    };
    img.src = blobURL;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-slate-900 border-slate-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Cetak QR Label</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col items-center justify-center p-6 space-y-6">
          {/* Printable Area preview */}
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
                <h4 className="font-mono font-bold text-lg text-amber-500 tracking-wider">
                  {item.item_code}
                </h4>
                <p className="text-sm font-semibold text-white line-clamp-2">
                  {item.name}
                </p>
                <p className="text-xs text-slate-400">
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
                onClick={handleDownloadImage}
                className="w-full bg-gradient-to-r from-primary to-primary/80 hover:opacity-90 border-0 text-primary-foreground font-semibold rounded-xl min-h-[44px]"
              >
                <Download className="mr-2 h-4 w-4" />
                Unduh Label
              </Button>
            </motion.div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
