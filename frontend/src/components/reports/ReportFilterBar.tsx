import { useEffect, useState, ChangeEvent } from 'react';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { useCategories } from '../../hooks/useCategories';
import { useSuppliers } from '../../hooks/useSuppliers';
import { Label } from '../ui/label';
import { Search, Calendar } from 'lucide-react';
import { ReportFilters } from '../../hooks/useReports';

export type DatePreset = 'today' | '7d' | '30d' | 'this_month' | 'custom' | 'all';

interface ReportFilterBarProps {
  reportType: string;
  filters: ReportFilters;
  onChange: (newFilters: ReportFilters) => void;
  showBranch?: boolean;
  showCategory?: boolean;
  showSupplier?: boolean;
  showSearch?: boolean;
  showDateRange?: boolean;
  searchPlaceholder?: string;
}

// Helper to calculate date range based on preset
export const calculateDateRange = (preset: DatePreset, customStart?: string, customEnd?: string) => {
  const today = new Date();
  const formatLocalISO = (d: Date) => {
    // Format as YYYY-MM-DD
    const offset = d.getTimezoneOffset();
    const local = new Date(d.getTime() - offset * 60 * 1000);
    return local.toISOString().split('T')[0];
  };

  switch (preset) {
    case 'today': {
      const dateStr = formatLocalISO(today);
      return { start_date: dateStr, end_date: dateStr };
    }
    case '7d': {
      const past = new Date();
      past.setDate(today.getDate() - 6); // 7 days total including today
      return { start_date: formatLocalISO(past), end_date: formatLocalISO(today) };
    }
    case '30d': {
      const past = new Date();
      past.setDate(today.getDate() - 29); // 30 days total including today
      return { start_date: formatLocalISO(past), end_date: formatLocalISO(today) };
    }
    case 'this_month': {
      const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
      return { start_date: formatLocalISO(firstDay), end_date: formatLocalISO(today) };
    }
    case 'custom': {
      return { start_date: customStart || '', end_date: customEnd || '' };
    }
    case 'all':
    default: {
      return { start_date: null, end_date: null };
    }
  }
};

export function ReportFilterBar({
  reportType,
  filters,
  onChange,
  showBranch = true,
  showCategory = false,
  showSupplier = false,
  showSearch = true,
  showDateRange = false,
  searchPlaceholder = 'Cari...'
}: ReportFilterBarProps) {
  const user = useAuthStore((state) => state.user);
  const isSuperAdmin = user?.role === 'super_admin';

  const { data: branches } = useBranches();
  const { data: categories } = useCategories();
  const { data: suppliers } = useSuppliers();

  // Local state for search to debounce input
  const [searchInput, setSearchInput] = useState(filters.search || '');
  const [datePreset, setDatePreset] = useState<DatePreset>(() => {
    const stored = localStorage.getItem(`wms_report_preset_${reportType}`);
    return (stored as DatePreset) || 'all';
  });

  const [customStart, setCustomStart] = useState(() => filters.start_date || '');
  const [customEnd, setCustomEnd] = useState(() => filters.end_date || '');

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      if (filters.search !== searchInput) {
        updateFilters({ search: searchInput });
      }
    }, 400);

    return () => clearTimeout(handler);
  }, [searchInput]);

  // Sync state if filters prop changes externally
  useEffect(() => {
    if (filters.search !== undefined && filters.search !== searchInput) {
      setSearchInput(filters.search);
    }
    if (filters.start_date !== undefined && filters.start_date !== customStart) {
      setCustomStart(filters.start_date || '');
    }
    if (filters.end_date !== undefined && filters.end_date !== customEnd) {
      setCustomEnd(filters.end_date || '');
    }
  }, [filters]);

  const updateFilters = (updated: Partial<ReportFilters>) => {
    const nextFilters = { ...filters, ...updated };
    onChange(nextFilters);
    // Save to localStorage
    try {
      const persistable = { ...nextFilters };
      delete persistable.page; // Don't persist pagination page
      localStorage.setItem(`wms_report_filter_${reportType}`, JSON.stringify(persistable));
    } catch (e) {
      console.error('Failed to persist filters:', e);
    }
  };

  const handleBranchChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateFilters({ branch_id: val ? Number(val) : null, page: 1 });
  };

  const handleCategoryChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateFilters({ category_id: val ? Number(val) : null, page: 1 });
  };

  const handleSupplierChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    updateFilters({ supplier_id: val ? Number(val) : null, page: 1 });
  };

  const handlePresetChange = (e: ChangeEvent<HTMLSelectElement>) => {
    const preset = e.target.value as DatePreset;
    setDatePreset(preset);
    localStorage.setItem(`wms_report_preset_${reportType}`, preset);

    if (preset !== 'custom') {
      const dates = calculateDateRange(preset);
      updateFilters({
        start_date: dates.start_date,
        end_date: dates.end_date,
        page: 1
      });
    }
  };

  const handleCustomDateChange = (type: 'start' | 'end', val: string) => {
    if (type === 'start') {
      setCustomStart(val);
      updateFilters({ start_date: val, page: 1 });
    } else {
      setCustomEnd(val);
      updateFilters({ end_date: val, page: 1 });
    }
  };

  return (
    <div className="bg-card border border-border rounded-xl p-5 shadow-md space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Search Field */}
        {showSearch && (
          <div className="space-y-1 sm:col-span-2">
            <Label htmlFor="search-filter" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Cari Kata Kunci</Label>
            <div className="relative flex items-center">
              <Search className="absolute left-3 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                id="search-filter"
                name="search-filter"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder={searchPlaceholder}
                className="w-full h-10 pl-9 pr-4 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent placeholder-slate-650"
              />
            </div>
          </div>
        )}

        {/* Branch Selector (Super Admin Only) */}
        {showBranch && isSuperAdmin && (
          <div className="space-y-1">
            <Label htmlFor="branch-filter" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Gudang Cabang</Label>
            <select
              id="branch-filter"
              name="branch_filter"
              value={filters.branch_id || ''}
              onChange={handleBranchChange}
              className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
            >
              <option value="">Semua Cabang</option>
              {branches?.filter(b => b.is_active).map((b) => (
                <option key={b.branch_id} value={b.branch_id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Category Selector */}
        {showCategory && (
          <div className="space-y-1">
            <Label htmlFor="category-filter" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Kategori Barang</Label>
            <select
              id="category-filter"
              name="category_filter"
              value={filters.category_id || ''}
              onChange={handleCategoryChange}
              className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
            >
              <option value="">Semua Kategori</option>
              {categories?.filter(c => c.is_active).map((c) => (
                <option key={c.category_id} value={c.category_id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Supplier Selector */}
        {showSupplier && (
          <div className="space-y-1">
            <Label htmlFor="supplier-filter" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Merk / Supplier</Label>
            <select
              id="supplier-filter"
              name="supplier_filter"
              value={filters.supplier_id || ''}
              onChange={handleSupplierChange}
              className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
            >
              <option value="">Semua Supplier</option>
              {suppliers?.filter(s => s.is_active).map((s) => (
                <option key={s.supplier_id} value={s.supplier_id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Date Presets Selector */}
        {showDateRange && (
          <div className="space-y-1">
            <Label htmlFor="date-preset" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Periode Waktu</Label>
            <select
              id="date-preset"
              name="date_preset"
              value={datePreset}
              onChange={handlePresetChange}
              className="w-full h-10 px-3 py-2 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
            >
              <option value="all">Semua Waktu</option>
              <option value="today">Hari Ini</option>
              <option value="7d">7 Hari Terakhir</option>
              <option value="30d">30 Hari Terakhir</option>
              <option value="this_month">Bulan Ini</option>
              <option value="custom">Kustom Tanggal...</option>
            </select>
          </div>
        )}
      </div>

      {/* Conditional Custom Date Inputs */}
      {showDateRange && datePreset === 'custom' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-800/40">
          <div className="space-y-1">
            <Label htmlFor="start-date" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Dari Tanggal</Label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-3 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                id="start-date"
                name="start_date"
                type="date"
                value={customStart}
                onChange={(e) => handleCustomDateChange('start', e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label htmlFor="end-date" className="text-xs text-slate-400 font-semibold uppercase tracking-wider">Sampai Tanggal</Label>
            <div className="relative flex items-center">
              <Calendar className="absolute left-3 h-4 w-4 text-slate-500 pointer-events-none" />
              <input
                id="end-date"
                name="end_date"
                type="date"
                value={customEnd}
                onChange={(e) => handleCustomDateChange('end', e.target.value)}
                className="w-full h-10 pl-9 pr-4 bg-slate-950 border border-slate-850 rounded-lg text-sm text-white focus:outline-none focus:ring-1 focus:ring-primary focus:border-transparent"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
