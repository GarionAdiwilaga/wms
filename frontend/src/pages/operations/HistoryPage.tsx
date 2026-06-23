import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/auth-store';
import { useBranches } from '../../hooks/useBranches';
import { useStockInSessions } from '../../hooks/useStockIn';
import { useOutboundSessions } from '../../hooks/useOutbound';
import { PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/button';
import { LoadingState } from '../../components/ui/LoadingState';
import { EmptyState } from '../../components/ui/EmptyState';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Archive, 
  ShoppingCart, 
  ChevronDown, 
  ChevronUp, 
  Calendar, 
  FileText, 
  Hash
} from 'lucide-react';

export function HistoryPage() {
  const user = useAuthStore((state) => state.user);
  const { data: branches } = useBranches();
  
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'stock-in';
  
  const [stockInPage, setStockInPage] = useState(1);
  const [outboundPage, setOutboundPage] = useState(1);
  
  // Expanded session detail state
  const [expandedSessions, setExpandedSessions] = useState<Record<string, boolean>>({});

  const filters = {
    branch_id: user?.role === 'super_admin' ? null : user?.branch_id,
    page: activeTab === 'stock-in' ? stockInPage : outboundPage,
    page_size: 10
  };

  const { 
    data: stockInResponse, 
    isLoading: isLoadingStockIn 
  } = useStockInSessions({
    branch_id: filters.branch_id,
    page: stockInPage,
    page_size: 10
  });

  const { 
    data: outboundResponse, 
    isLoading: isLoadingOutbound 
  } = useOutboundSessions({
    branch_id: filters.branch_id,
    page: outboundPage,
    page_size: 10
  });

  const toggleExpand = (type: string, id: number) => {
    const key = `${type}-${id}`;
    setExpandedSessions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleTabChange = (tab: string) => {
    setSearchParams({ tab });
  };

  const getBranchName = (id: number) => {
    return branches?.find(b => b.branch_id === id)?.name || `Cabang #${id}`;
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const renderStockInList = () => {
    if (isLoadingStockIn) return <LoadingState />;
    if (!stockInResponse || stockInResponse.data.length === 0) {
      return (
        <EmptyState 
          title="Belum ada riwayat stok masuk" 
          description="Lakukan pencatatan stok masuk di menu Stok Masuk."
        />
      );
    }

    return (
      <div className="space-y-4">
        {stockInResponse.data.map((session) => {
          const key = `stock-in-${session.session_id}`;
          const isExpanded = !!expandedSessions[key];
          
          return (
            <div key={session.session_id} className="bg-card border border-border rounded-xl overflow-hidden shadow-md">
              {/* Header summary panel */}
              <button
                type="button"
                onClick={() => toggleExpand('stock-in', session.session_id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-900/35 transition-colors focus:outline-none"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-500 capitalize">
                      {session.status === 'completed' ? 'Selesai' : session.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 font-mono flex items-center gap-1">
                      <Hash className="h-3 w-3" /> #{session.session_id}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      | {getBranchName(session.branch_id)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold text-white">Ref:</span> {session.reference_no || '-'}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold text-white">Tanggal:</span> {formatDate(session.transaction_date)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500">Jumlah Barang</p>
                    <p className="text-sm font-bold text-white">
                      {session.lines.reduce((sum, l) => sum + l.quantity, 0)} pcs
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
              </button>

              {/* Expanded details container */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-slate-800 bg-slate-950/20"
                  >
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Meta info row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 border-b border-slate-850 pb-3">
                        <div>
                          <p><span className="font-semibold text-slate-300">No. Invoice Supplier:</span> {session.supplier_invoice_no || '-'}</p>
                          <p className="mt-1"><span className="font-semibold text-slate-300">Catatan:</span> {session.notes || '-'}</p>
                        </div>
                        <div>
                          <p><span className="font-semibold text-slate-300">Dibuat Oleh:</span> User #{session.created_by}</p>
                        </div>
                      </div>

                      {/* Items list */}
                      <div>
                        <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Item Detail</h4>
                        <div className="space-y-2">
                          {session.lines.map((line) => (
                            <div key={line.line_id} className="flex justify-between items-center gap-4 bg-slate-900/30 p-2.5 rounded-lg border border-slate-850/50">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{line.item_name || 'Komponen'}</p>
                                <span className="text-[10px] font-mono px-1 rounded bg-slate-800 border border-slate-700 text-amber-500 mt-0.5 inline-block">
                                  {line.item_code}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-white flex-shrink-0">
                                {line.quantity} pcs
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Pagination */}
        {stockInResponse.total_pages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-4">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                disabled={stockInPage === 1}
                onClick={() => setStockInPage(p => Math.max(p - 1, 1))}
                className="border-slate-800 text-white hover:bg-slate-900"
              >
                Sebelumnya
              </Button>
            </motion.div>
            <span className="text-sm text-slate-400">
              Halaman {stockInPage} dari {stockInResponse.total_pages}
            </span>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                disabled={stockInPage === stockInResponse.total_pages}
                onClick={() => setStockInPage(p => Math.min(p + 1, stockInResponse.total_pages))}
                className="border-slate-800 text-white hover:bg-slate-900"
              >
                Selanjutnya
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  const renderOutboundList = () => {
    if (isLoadingOutbound) return <LoadingState />;
    if (!outboundResponse || outboundResponse.data.length === 0) {
      return (
        <EmptyState 
          title="Belum ada riwayat barang keluar" 
          description="Lakukan checkout barang keluar di menu Barang Keluar."
        />
      );
    }

    return (
      <div className="space-y-4">
        {outboundResponse.data.map((session) => {
          const key = `outbound-${session.session_id}`;
          const isExpanded = !!expandedSessions[key];
          
          return (
            <div key={session.session_id} className="bg-card border border-border rounded-xl overflow-hidden shadow-md">
              {/* Header summary panel */}
              <button
                type="button"
                onClick={() => toggleExpand('outbound', session.session_id)}
                className="w-full text-left p-4 sm:p-5 flex items-center justify-between gap-4 hover:bg-slate-900/35 transition-colors focus:outline-none"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/10 text-amber-500 capitalize">
                      {session.status === 'completed' ? 'Selesai' : session.status}
                    </span>
                    <span className="text-sm font-semibold text-slate-400 font-mono flex items-center gap-1">
                      <Hash className="h-3 w-3" /> #{session.session_id}
                    </span>
                    <span className="text-xs text-slate-400 font-medium">
                      | {getBranchName(session.branch_id)}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-2">
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <FileText className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold text-white">Ref (Order/SPK):</span> {session.reference_no || '-'}
                    </div>
                    <div className="flex items-center gap-1.5 text-sm text-slate-300">
                      <Calendar className="h-4 w-4 text-slate-500" />
                      <span className="font-semibold text-white">Tanggal:</span> {formatDate(session.transaction_date)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-slate-500">Jumlah Barang</p>
                    <p className="text-sm font-bold text-white">
                      {session.lines.reduce((sum, l) => sum + l.quantity, 0)} pcs
                    </p>
                  </div>
                  {isExpanded ? <ChevronUp className="h-5 w-5 text-slate-400" /> : <ChevronDown className="h-5 w-5 text-slate-400" />}
                </div>
              </button>

              {/* Expanded details container */}
              <AnimatePresence initial={false}>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: 'auto' }}
                    exit={{ height: 0 }}
                    transition={{ duration: 0.25, ease: 'easeInOut' }}
                    className="overflow-hidden border-t border-slate-800 bg-slate-950/20"
                  >
                    <div className="p-4 sm:p-5 space-y-4">
                      {/* Meta info row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs text-slate-400 border-b border-slate-850 pb-3">
                        <div>
                          <p className="mt-1"><span className="font-semibold text-slate-300">Catatan:</span> {session.notes || '-'}</p>
                        </div>
                        <div>
                          <p><span className="font-semibold text-slate-300">Checkout Oleh:</span> User #{session.created_by}</p>
                        </div>
                      </div>

                      {/* Items list */}
                      <div>
                        <h4 className="text-xs font-semibold text-amber-500 uppercase tracking-wider mb-2">Item Detail</h4>
                        <div className="space-y-2">
                          {session.lines.map((line) => (
                            <div key={line.line_id} className="flex justify-between items-center gap-4 bg-slate-900/30 p-2.5 rounded-lg border border-slate-850/50">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-white truncate">{line.item_name || 'Komponen'}</p>
                                <span className="text-[10px] font-mono px-1 rounded bg-slate-800 border border-slate-700 text-amber-500 mt-0.5 inline-block">
                                  {line.item_code}
                                </span>
                              </div>
                              <span className="text-sm font-bold text-white flex-shrink-0">
                                {line.quantity} pcs
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}

        {/* Pagination */}
        {outboundResponse.total_pages > 1 && (
          <div className="flex justify-center items-center gap-4 pt-4">
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                disabled={outboundPage === 1}
                onClick={() => setOutboundPage(p => Math.max(p - 1, 1))}
                className="border-slate-800 text-white hover:bg-slate-900"
              >
                Sebelumnya
              </Button>
            </motion.div>
            <span className="text-sm text-slate-400">
              Halaman {outboundPage} dari {outboundResponse.total_pages}
            </span>
            <motion.div whileTap={{ scale: 0.95 }}>
              <Button
                variant="outline"
                size="sm"
                disabled={outboundPage === outboundResponse.total_pages}
                onClick={() => setOutboundPage(p => Math.min(p + 1, outboundResponse.total_pages))}
                className="border-slate-800 text-white hover:bg-slate-900"
              >
                Selanjutnya
              </Button>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Riwayat Transaksi"
        description="Daftar lengkap riwayat stok masuk dan pengeluaran barang."
      />

      {/* Tabs selectors with standard bento styling */}
      <div className="flex gap-2 p-1 bg-slate-900 border border-slate-800 rounded-xl max-w-md shadow-inner">
        <button
          type="button"
          onClick={() => handleTabChange('stock-in')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all min-h-[40px] ${
            activeTab === 'stock-in'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <Archive className="h-4 w-4" />
          Stok Masuk
        </button>
        <button
          type="button"
          onClick={() => handleTabChange('outbound')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-lg transition-all min-h-[40px] ${
            activeTab === 'outbound'
              ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
              : 'text-slate-400 hover:text-white hover:bg-slate-850'
          }`}
        >
          <ShoppingCart className="h-4 w-4" />
          Barang Keluar
        </button>
      </div>

      {/* Content panel */}
      <div className="mt-4">
        {activeTab === 'stock-in' ? renderStockInList() : renderOutboundList()}
      </div>
    </div>
  );
}
