import { useState, useEffect, useRef } from 'react';
import { Search, QrCode, X, Image as ImageIcon, CameraOff, Zap } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { useItems, Item, useFrequentItems, FrequentItemEntry } from '../../hooks/useItems';
import { useKeyboardShortcut } from '../../hooks/useKeyboardShortcut';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { motion, AnimatePresence } from 'framer-motion';

interface ItemSearchProps {
  onSelect?: (item: Item) => void;
  placeholder?: string;
  className?: string;
  clearOnSelect?: boolean;
  value?: string;
  onChange?: (value: string) => void;
  showDropdown?: boolean;
  /**
   * Phase 6 — Frequent Items Carousel.
   * When provided, shows a horizontal quick-select strip below the search bar
   * with the user's most frequently handled items for this branch.
   * When omitted (undefined), the carousel is hidden — fully backward-compatible.
   * Pass `null` explicitly to keep the hook idle (e.g. super_admin before branch selection).
   */
  branchId?: number | null;
}

export function ItemSearch({ 
  onSelect, 
  placeholder = 'Cari barang (nama, kode, merk)...', 
  className,
  clearOnSelect = true,
  value,
  onChange,
  showDropdown = true,
  branchId,
}: ItemSearchProps) {
  const [query, setQuery] = useState(value || '');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);

  // Phase 6 — Frequent Items Carousel
  // branchId === undefined  → carousel feature disabled (backward-compat)
  // branchId === null       → hook idle (super_admin, no branch selected)
  // branchId === number     → hook fires, carousel rendered when query empty
  const carouselEnabled = branchId !== undefined;
  const { data: frequentData, isLoading: isFrequentLoading } = useFrequentItems(
    carouselEnabled ? branchId : undefined
  );
  const frequentItems = frequentData?.data ?? [];
  const showCarousel = carouselEnabled && !!branchId && query.trim().length === 0 && !isDropdownOpen;
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scanTimeoutRef = useRef<any>(null);
  const scannerId = 'item-search-qr-reader';

  // Sync state with value prop if controlled
  useEffect(() => {
    if (value !== undefined) {
      setQuery(value);
    }
  }, [value]);

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
    if (showDropdown && debouncedQuery.trim().length >= 2) {
      setIsDropdownOpen(true);
    } else {
      setIsDropdownOpen(false);
    }
  }, [debouncedQuery, showDropdown]);

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
    if (onSelect) {
      onSelect(item);
    }
    if (clearOnSelect) {
      setQuery('');
      setDebouncedQuery('');
      if (onChange) {
        onChange('');
      }
    } else {
      setQuery(item.name);
      setDebouncedQuery(item.name);
      if (onChange) {
        onChange(item.name);
      }
    }
    setIsDropdownOpen(false);
  };

  // Reset selected index when dropdown closes or results change
  useEffect(() => {
    setSelectedIndex(-1);
  }, [isDropdownOpen, searchResults]);

  useKeyboardShortcut({
    key: 'ArrowDown',
    onKeyPressed: (e) => {
      if (isDropdownOpen && searchResults?.data) {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, searchResults.data.length - 1));
      }
    }
  });

  useKeyboardShortcut({
    key: 'ArrowUp',
    onKeyPressed: (e) => {
      if (isDropdownOpen) {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, -1));
      }
    }
  });

  useKeyboardShortcut({
    key: 'Enter',
    onKeyPressed: (e) => {
      if (isDropdownOpen && selectedIndex >= 0 && searchResults?.data) {
        e.preventDefault();
        handleSelect(searchResults.data[selectedIndex]);
      }
    }
  });

  const handleInputChange = (val: string) => {
    setQuery(val);
    if (onChange) {
      onChange(val);
    }
  };

  const startScanning = async () => {
    setIsScanning(true);
    setCameraError(null);

    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current as any);
    }

    // Give react time to mount the reader div
    scanTimeoutRef.current = setTimeout(async () => {
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
            if (onChange) {
              onChange(decodedText);
            }
            stopScanning();
          },
          () => {
            // Silent failure for individual frames
          }
        );
      } catch (err: any) {
        console.error('Camera access failed:', err);
        setCameraError('Gagal mengakses kamera. Pastikan izin kamera diberikan.');
        scannerRef.current = null;
      }
    }, 300);
  };

  const stopScanning = () => {
    if (scanTimeoutRef.current) {
      clearTimeout(scanTimeoutRef.current as any);
      scanTimeoutRef.current = null;
    }

    if (scannerRef.current) {
      const stopPromise = scannerRef.current.isScanning 
        ? scannerRef.current.stop() 
        : Promise.resolve();
        
      stopPromise
        .catch((err) => {
          console.error('Error stopping scanner:', err);
        })
        .finally(() => {
          scannerRef.current = null;
          setIsScanning(false);
          setCameraError(null);
        });
    } else {
      setIsScanning(false);
      setCameraError(null);
    }
  };

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      {/* Search Input Bar */}
      <div className="relative flex items-center">
        <Search className="absolute left-3 h-5 w-5 text-slate-400" />
        <label htmlFor="item-search-query" className="sr-only">Cari Barang</label>
        <Input
          id="item-search-query"
          name="item-search-query"
          type="text"
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          placeholder={placeholder}
          className="pl-10 pr-12 bg-slate-950 border-slate-800 focus-visible:ring-amber-500 text-white min-h-[44px]"
          onFocus={() => {
            if (showDropdown && query.trim().length >= 2) {
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
              if (onChange) {
                onChange('');
              }
              setIsDropdownOpen(false);
            }}
            className="absolute right-12 text-slate-400 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        )}
        <motion.div whileTap={{ scale: 0.9 }} className="absolute right-1">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={startScanning}
            className="text-slate-400 hover:text-amber-500 hover:bg-transparent min-h-[40px] min-w-[40px] rounded-lg"
            title="Scan QR Code"
          >
            <QrCode className="h-5 w-5" />
          </Button>
        </motion.div>
      </div>

      {/* Dropdown Results */}
      {showDropdown && isDropdownOpen && (
        <div className="absolute z-40 mt-1 w-full rounded-md border border-slate-800 bg-slate-900 shadow-lg max-h-80 overflow-y-auto">
          {isLoading ? (
            <div className="p-4 text-center text-sm text-slate-400">Mencari...</div>
          ) : searchResults?.data.length === 0 ? (
            <div className="p-4 text-center text-sm text-slate-400">Barang tidak ditemukan.</div>
          ) : (
            <ul className="py-1">
              {searchResults?.data.map((item, index) => (
                <li key={item.item_id}>
                  <button
                    type="button"
                    onClick={() => handleSelect(item)}
                    className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                      selectedIndex === index ? 'bg-slate-800' : 'hover:bg-slate-800'
                    }`}
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

      {/* ------------------------------------------------------------------ */}
      {/* Phase 6 — Frequent Items Carousel                                   */}
      {/* Appears below the search bar when:                                  */}
      {/*   • branchId prop is provided (feature enabled)                     */}
      {/*   • a branch is actually selected (branchId is truthy)              */}
      {/*   • the search query is empty (gives way to dropdown results)       */}
      {/* ------------------------------------------------------------------ */}
      <AnimatePresence>
        {showCarousel && (
          <motion.div
            key="frequent-carousel"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="mt-2"
          >
            {/* Section header */}
            <div className="flex items-center gap-1.5 px-1 mb-2">
              <Zap className="h-3.5 w-3.5 text-amber-500 flex-shrink-0" />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
                Sering Digunakan
              </span>
            </div>

            {isFrequentLoading ? (
              /* Skeleton shimmer while loading */
              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div
                    key={i}
                    className="flex-shrink-0 w-20 h-24 rounded-lg bg-slate-800 animate-pulse"
                  />
                ))}
              </div>
            ) : frequentItems.length === 0 ? (
              /* Empty state — only shown if user has no history yet */
              <p className="text-xs text-slate-600 px-1 pb-1">
                Belum ada riwayat. Gunakan fitur ini setelah melakukan transaksi pertama.
              </p>
            ) : (
              /* Horizontal chip strip */
              <div className="flex gap-2 overflow-x-auto pb-1 [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                {frequentItems.map((entry: FrequentItemEntry, idx: number) => {
                  // Map FrequentItemEntry → Item shape so handleSelect receives
                  // the same object type as a standard search-dropdown pick.
                  const itemProxy: Item = {
                    item_id: entry.item_id,
                    item_code: entry.item_code,
                    name: entry.name,
                    description: null,
                    category_id: entry.category?.category_id ?? 0,
                    supplier_id: entry.supplier?.supplier_id ?? 0,
                    uom_id: 0,
                    minimum_stock: 0,
                    image_url: entry.image_url,
                    image_path: entry.image_url,
                    is_active: true,
                    created_at: '',
                    updated_at: '',
                    category: entry.category,
                    supplier: entry.supplier,
                  };

                  return (
                    <motion.button
                      key={entry.item_id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.92 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: idx * 0.04, duration: 0.15 }}
                      onClick={() => handleSelect(itemProxy)}
                      title={`${entry.name} — ${entry.item_code}`}
                      aria-label={`Pilih ${entry.name}`}
                      className={
                        'flex-shrink-0 flex flex-col items-center gap-1.5 w-20 p-2 rounded-lg ' +
                        'bg-slate-900 border border-slate-800 ' +
                        'hover:border-amber-500/60 hover:bg-slate-800 ' +
                        'active:scale-95 transition-all duration-150 ' +
                        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500'
                      }
                    >
                      {/* Item thumbnail */}
                      <div className="h-10 w-10 flex-shrink-0 rounded-md bg-slate-950 border border-slate-800 overflow-hidden flex items-center justify-center">
                        {entry.image_url ? (
                          <img
                            src={entry.image_url}
                            alt={entry.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <ImageIcon className="h-4 w-4 text-slate-600" />
                        )}
                      </div>

                      {/* Item name — truncated to 2 lines */}
                      <p className="text-[10px] text-slate-300 text-center leading-tight line-clamp-2 w-full">
                        {entry.name}
                      </p>

                      {/* Item code badge */}
                      <span className="text-[9px] px-1 py-0.5 rounded bg-slate-950 border border-slate-800 text-amber-500 font-mono font-semibold truncate max-w-full">
                        {entry.item_code}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

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
