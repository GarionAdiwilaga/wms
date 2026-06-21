import { useState, useEffect, useRef } from 'react';
import { Search, QrCode, X, Image as ImageIcon, CameraOff } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useItems, Item } from '../../hooks/useItems';
import { Input } from '../ui/input';
import { Button } from '../ui/button';

interface ItemSearchProps {
  onSelect: (item: Item) => void;
  placeholder?: string;
  className?: string;
  clearOnSelect?: boolean;
}

export function ItemSearch({ 
  onSelect, 
  placeholder = 'Cari barang (nama, kode, merk)...', 
  className,
  clearOnSelect = true
}: ItemSearchProps) {
  const [query, setQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerId = 'item-search-qr-reader';

  // Fetch search results using our hook
  const { data: searchResults, isLoading } = useItems({
    q: debouncedQuery,
    is_active: true,
    page_size: 10
  });

  // Debounce manual typing search
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);

    return () => clearTimeout(handler);
  }, [query]);

  // Open dropdown when query has length
  useEffect(() => {
    if (debouncedQuery.trim().length >= 2) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  }, [debouncedQuery]);

  // Handle clicking outside of search component to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  const handleSelect = (item: Item) => {
    onSelect(item);
    if (clearOnSelect) {
      setQuery('');
      setDebouncedQuery('');
    } else {
      setQuery(item.name);
      setDebouncedQuery(item.name);
    }
    setIsDropdownOpen(false);
  };

  const startScanning = async () => {
    setIsScanning(true);
    setCameraError(null);

    // Give react time to mount the reader div
    setTimeout(async () => {
      try {
        const html5Qrcode = new Html5Qrcode(scannerId);
        scannerRef.current = html5Qrcode;

        await html5Qrcode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: (width, height) => {
              const minDimension = Math.min(width, height);
              const qrSize = Math.floor(minDimension * 0.65);
              return { width: qrSize, height: qrSize };
            }
          },
          (decodedText) => {
            // QR successfully scanned!
            // Populate the search field and stop scanning
            setQuery(decodedText);
            setDebouncedQuery(decodedText);
            stopScanning();
          },
          () => {
            // Silent failure for individual frames
          }
        );
      } catch (err: any) {
        console.error('Camera access failed:', err);
        setCameraError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
        // Scanner didn't start, keep scanning active but show error
      }
    }, 300);
  };

  const stopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current.stop()
        .then(() => {
          scannerRef.current = null;
        })
        .catch((err) => {
          console.error('Error stopping scanner:', err);
        });
    }
    setIsScanning(false);
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-5 w-5 text-slate-400" />
        <Input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-12 bg-slate-950 border-slate-800 focus-visible:ring-amber-500 text-white min-h-[44px]"
          onFocus={() => {
            if (query.trim().length >= 2) {
              setIsDropdownOpen(true);
            }
          }}
        />
        {query && (
          <button 
            type="button"
            onClick={() => {
              setQuery('');
              setDebouncedQuery('');
              setIsDropdownOpen(false);
            }}
            className="absolute right-12 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={startScanning}
          className="absolute right-1 text-slate-400 hover:text-amber-500 hover:bg-transparent min-h-[40px] min-w-[40px]"
          title="Scan QR Code"
        >
          <QrCode className="h-5 w-5" />
        </Button>
      </div>

      {/* Dropdown Results */}
      {isDropdownOpen && (
        <div className="absolute z-40 mt-1 w-full rounded-md border border-slate-800 bg-slate-900 shadow-lg max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-slate-400">Mencari...</div>
          ) : searchResults?.data.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">Barang tidak ditemukan.</div>
          ) : (
            <ul className="py-1">
              {searchResults?.data.map((item) => (
                <li key={item.item_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors"
                  >
                    {/* Thumbnail Preview */}
                    <div className="h-10 w-10 flex-shrink-0 items-center justify-center rounded bg-slate-950 overflow-hidden border border-slate-800 flex">
                      {item.image_url ? (
                        <img 
                          src={item.image_url} 
                          alt={item.name} 
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="h-5 w-5 text-slate-600" />
                      )}
                    </div>
                    {/* Text Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-850 border border-slate-800 text-amber-500 uppercase font-mono font-semibold">
                          {item.item_code}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 truncate">
                        Merk: {item.supplier?.name || '-'} | Kategori: {item.category?.name || '-'}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* QR Code Scanner Overlay */}
      {isScanning && (
        <div className="fixed inset-0 z-50 flex flex-col bg-slate-950 md:bg-slate-950/90 items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-lg overflow-hidden relative flex flex-col h-full md:h-auto max-h-[90vh]">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-800">
              <h3 className="font-semibold text-white">Scan QR Code Barang</h3>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={stopScanning}
                className="text-slate-400 hover:text-white min-h-[40px] min-w-[40px]"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>

            {/* Camera View Area */}
            <div className="flex-1 relative bg-black flex items-center justify-center min-h-[300px]">
              {cameraError ? (
                <div className="flex flex-col items-center justify-center p-6 text-center text-red-400">
                  <CameraOff className="h-12 w-12 mb-3" />
                  <p className="text-sm font-medium mb-4">{cameraError}</p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={stopScanning}
                    className="border-slate-700 hover:bg-slate-800 text-white"
                  >
                    Tutup & Input Manual
                  </Button>
                </div>
              ) : (
                <div id={scannerId} className="w-full h-full object-cover"></div>
              )}
            </div>

            {/* Footer */}
            <div className="px-4 py-4 border-t border-slate-800 text-center text-xs text-slate-400">
              Arahkan kamera ke QR Code barang untuk memindai otomatis.
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
