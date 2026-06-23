import { useState } from 'react';
import { api } from '../../lib/api';
import { Button } from '../ui/button';
import { Download, Loader2 } from 'lucide-react';
import { ReportFilters } from '../../hooks/useReports';
import { motion } from 'framer-motion';

interface ReportExportButtonsProps {
  endpoint: string; // e.g. "/reports/stock"
  filename: string; // e.g. "laporan_stok"
  filters: ReportFilters;
}

export function ReportExportButtons({ endpoint, filename, filters }: ReportExportButtonsProps) {
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingXlsx, setExportingXlsx] = useState(false);

  const handleExport = async (format: 'csv' | 'xlsx') => {
    const setLoader = format === 'csv' ? setExportingCsv : setExportingXlsx;
    setLoader(true);

    try {
      const params = new URLSearchParams();
      
      // Map all active filters to query params
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
      if (filters.user_id) params.append('user_id', filters.user_id.toString());
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      if (filters.search) params.append('search', filters.search);
      
      // Inject full ISO datetimes
      if (filters.start_date) params.append('start_date', `${filters.start_date}T00:00:00`);
      if (filters.end_date) params.append('end_date', `${filters.end_date}T23:59:59`);
      
      // Append format
      params.append('export', format);

      const response = await api.get(endpoint, {
        params,
        responseType: 'blob'
      });

      const contentType = format === 'csv' ? 'text/csv' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const blob = new Blob([response.data], { type: contentType });
      const url = window.URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${filename}_${new Date().toISOString().split('T')[0]}.${format}`);
      
      document.body.appendChild(link);
      link.click();
      
      // Cleanup
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
      alert('Gagal mengekspor laporan. Harap coba lagi.');
    } finally {
      setLoader(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      {/* CSV Export Button */}
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          onClick={() => handleExport('csv')}
          disabled={exportingCsv || exportingXlsx}
          className="border-slate-800 hover:bg-slate-800 text-slate-300 min-h-[40px] px-3.5 rounded-lg flex items-center gap-2"
        >
          {exportingCsv ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <Download className="h-4 w-4 text-slate-400" />
          )}
          <span>Ekspor CSV</span>
        </Button>
      </motion.div>

      {/* XLSX Export Button */}
      <motion.div whileTap={{ scale: 0.95 }}>
        <Button
          variant="outline"
          onClick={() => handleExport('xlsx')}
          disabled={exportingCsv || exportingXlsx}
          className="border-slate-800 hover:bg-slate-800 text-slate-350 min-h-[40px] px-3.5 rounded-lg flex items-center gap-2"
        >
          {exportingXlsx ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          ) : (
            <Download className="h-4 w-4 text-slate-400" />
          )}
          <span>Ekspor XLSX</span>
        </Button>
      </motion.div>
    </div>
  );
}
