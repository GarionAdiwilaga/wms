import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useQueryClient } from '@tanstack/react-query';
import {
  Archive,
  ShoppingCart,
  ArrowLeftRight,
  ClipboardList,
  RefreshCw,
  AlertTriangle,
  Truck,
  Clock,
  CheckCircle2,
  Building2,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  ArrowRightLeft,
  ClipboardCheck,
  PlusCircle,
  MinusCircle,
} from 'lucide-react';

import { useAuthStore } from '../../store/auth-store';
import { useDashboardSummary, RecentTransaction } from '../../hooks/useDashboard';
import { useBranches } from '../../hooks/useBranches';
import { TxTypeBadge } from '../../components/common/TxTypeBadge';
import { Button } from '../../components/ui/button';


// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatRelativeTime(isoString: string): string {
  const diff = Date.now() - new Date(isoString).getTime();
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} mnt lalu`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;
  return `${Math.floor(hours / 24)} hari lalu`;
}

/** Returns a human-friendly Indonesian date string, e.g. "Kamis, 26 Juni 2026" */
function formatIndonesianDate(): string {
  const now = new Date();
  return now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

/**
 * Resolves the visual config for an activity row.
 *
 * WHY reference_type is checked first:
 *   The inventory engine writes 'IN' / 'OUT' for ALL additive/subtractive operations,
 *   including transfers. The reference_type ('transfer', 'stock_in', 'outbound', 'opname')
 *   is the authoritative discriminator for the business operation.
 */
function resolveTxVisual(tx: RecentTransaction): {
  icon: React.ElementType;
  color: string;
  border: string;
  isDebit: boolean;
} {
  const ref = tx.reference_type;
  const type = tx.transaction_type;

  // Transfer legs — both IN and OUT legs use reference_type='transfer'
  if (ref === 'transfer') {
    const isOut = type === 'OUT';
    return {
      icon: ArrowRightLeft,
      color: isOut ? 'text-orange-400' : 'text-sky-400',
      border: isOut ? 'border-orange-500/40' : 'border-sky-500/40',
      isDebit: isOut,
    };
  }

  // Stock opname adjustments
  if (ref === 'opname') {
    return { icon: ClipboardCheck, color: 'text-slate-400', border: 'border-slate-600/40', isDebit: false };
  }

  // Explicit ADJUSTMENT types (manual corrections)
  if (type === 'ADJUSTMENT_PLUS') {
    return { icon: PlusCircle, color: 'text-violet-400', border: 'border-violet-500/40', isDebit: false };
  }
  if (type === 'ADJUSTMENT_MINUS') {
    return { icon: MinusCircle, color: 'text-rose-400', border: 'border-rose-500/40', isDebit: true };
  }

  // Standard stock-in (ref='stock_in') and outbound (ref='outbound')
  if (type === 'OUT') {
    return { icon: ArrowUp, color: 'text-red-400', border: 'border-red-500/40', isDebit: true };
  }
  // Default: additive IN
  return { icon: ArrowDown, color: 'text-emerald-400', border: 'border-emerald-500/40', isDebit: false };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface KpiCardProps {
  icon: React.ElementType;
  label: string;
  value: number | string;
  sub?: string;
  accent: string;   // tailwind color class on icon + value
  href?: string;
  isLoading?: boolean;
}

function KpiCard({ icon: Icon, label, value, sub, accent, href, isLoading }: KpiCardProps) {
  const navigate = useNavigate();
  return (
    <motion.div
      whileHover={href ? { scale: 1.01 } : undefined}
      whileTap={href ? { scale: 0.99 } : undefined}
      onClick={href ? () => navigate(href) : undefined}
      className={`bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col gap-3 ${href ? 'cursor-pointer hover:border-slate-600 transition-colors' : ''}`}
    >
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-slate-400">{label}</span>
        <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent.replace('text-', 'bg-').replace('-4', '-5').replace('500', '500/15')}`}>
          <Icon className={`h-5 w-5 ${accent}`} />
        </div>
      </div>
      {isLoading ? (
        <div className="h-8 w-20 rounded-md bg-slate-800 animate-pulse" />
      ) : (
        <div>
          <p className={`text-3xl font-bold ${accent}`}>{value}</p>
          {sub && <p className="text-xs text-slate-500 mt-0.5">{sub}</p>}
        </div>
      )}
    </motion.div>
  );
}

interface NotificationItemProps {
  icon: React.ElementType;
  count: number;
  label: string;
  href: string;
  urgency: 'high' | 'medium' | 'low';
}

function NotificationItem({ icon: Icon, count, label, href, urgency }: NotificationItemProps) {
  const navigate = useNavigate();
  const colors = {
    high: 'text-red-400 bg-red-500/10 border-red-500/20',
    medium: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    low: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
  };
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      onClick={() => navigate(href)}
      className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all ${colors[urgency]} hover:opacity-80`}
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      <span className="text-sm font-medium flex-1 text-left">{label}</span>
      <span className="text-lg font-bold">{count}</span>
    </motion.button>
  );
}

function ActivityRow({ tx }: { tx: RecentTransaction }) {
  const visual = resolveTxVisual(tx);
  const Icon = visual.icon;
  const qty = visual.isDebit ? `-${tx.quantity}` : `+${tx.quantity}`;

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      className={`flex items-center gap-3 py-2.5 pl-3 border-b border-slate-800/40 last:border-0 border-l-2 ${visual.border} ml-0.5`}
    >
      {/* Type icon — instant visual scan */}
      <div className={`flex-shrink-0 h-7 w-7 rounded-md flex items-center justify-center bg-slate-800/60 ${visual.color}`}>
        <Icon className="h-3.5 w-3.5" />
      </div>

      {/* Item + operator */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate leading-tight">{tx.item_name}</p>
        <p className="text-[10px] text-slate-500 truncate mt-0.5">
          <TxTypeBadge type={tx.transaction_type} variant="dot" className="inline-flex" />
          <span className="ml-1.5 text-slate-600">· {tx.operator_name}</span>
        </p>
      </div>

      {/* Qty + time */}
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold tabular-nums ${visual.color}`}>{qty}</p>
        <p className="text-[10px] text-slate-600 mt-0.5">{formatRelativeTime(tx.created_at)}</p>
      </div>
    </motion.div>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

export function DashboardPage() {
  const user = useAuthStore((state) => state.user);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: branches } = useBranches();

  // Super admin can switch branches; other roles are locked to their own branch
  const isSuperAdmin = user?.role === 'super_admin';
  const defaultBranchId = isSuperAdmin ? null : (user?.branch_id ?? null);
  const [selectedBranchId, setSelectedBranchId] = useState<number | null>(defaultBranchId);
  const [branchDropdownOpen, setBranchDropdownOpen] = useState(false);

  const effectiveBranchId = isSuperAdmin ? selectedBranchId : defaultBranchId;

  const { data: summary, isLoading, isError, refetch } = useDashboardSummary(effectiveBranchId);

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['dashboard', 'summary'] });
    refetch();
  };

  const notifications = summary?.notifications;
  const totalAlerts =
    (notifications?.low_stock_count ?? 0) +
    (notifications?.transfers_awaiting_receipt ?? 0) +
    (notifications?.overdue_opname_sessions ?? 0);
  const allClear = !isLoading && totalAlerts === 0;

  const selectedBranchName =
    isSuperAdmin
      ? branches?.find((b) => b.branch_id === selectedBranchId)?.name ?? 'Semua Cabang'
      : user?.branch_id
        ? branches?.find((b) => b.branch_id === user.branch_id)?.name ?? 'Cabang'
        : 'Cabang';

  // Indonesian date — computed once per render
  const todayFormatted = formatIndonesianDate();

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-white">Hari Ini</h1>
          <p className="text-sm text-slate-400 mt-0.5">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-2">
          {/* Super Admin branch selector */}
          {isSuperAdmin && (
            <div className="relative">
              <button
                onClick={() => setBranchDropdownOpen((o) => !o)}
                className="flex items-center gap-2 px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-slate-300 hover:border-slate-500 transition-colors"
              >
                <Building2 className="h-4 w-4 text-amber-500" />
                {selectedBranchName}
                <ChevronDown className="h-3.5 w-3.5 text-slate-500" />
              </button>
              <AnimatePresence>
                {branchDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    transition={{ duration: 0.12 }}
                    className="absolute right-0 z-30 mt-1 w-48 rounded-lg border border-slate-700 bg-slate-900 shadow-xl py-1"
                  >
                    <button
                      onClick={() => { setSelectedBranchId(null); setBranchDropdownOpen(false); }}
                      className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                    >
                      Semua Cabang
                    </button>
                    {branches?.filter((b) => b.is_active).map((b) => (
                      <button
                        key={b.branch_id}
                        onClick={() => { setSelectedBranchId(b.branch_id); setBranchDropdownOpen(false); }}
                        className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800"
                      >
                        {b.name}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Manual refresh */}
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
            className="border-slate-700 hover:bg-slate-800 text-slate-300"
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${isLoading ? 'animate-spin' : ''}`} />
            Perbarui
          </Button>
        </div>
      </div>

      {isError && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
          Gagal memuat data dashboard. Coba perbarui halaman.
        </div>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* KPI Cards Row                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={Archive}
          label="Stok Masuk Hari Ini"
          value={summary?.stock_in_today.total_units ?? 0}
          sub={
            (summary?.stock_in_today.session_count ?? 0) > 0
              ? `${summary!.stock_in_today.session_count} sesi masuk`
              : 'Belum ada penerimaan hari ini'
          }
          accent="text-amber-400"
          href="/operations/stock-in"
          isLoading={isLoading}
        />
        <KpiCard
          icon={ShoppingCart}
          label="Barang Keluar Hari Ini"
          value={summary?.outbound_today.total_units ?? 0}
          sub={
            (summary?.outbound_today.session_count ?? 0) > 0
              ? `${summary!.outbound_today.session_count} sesi keluar`
              : 'Belum ada pengeluaran hari ini'
          }
          accent="text-sky-400"
          href="/operations/outbound"
          isLoading={isLoading}
        />
        <KpiCard
          icon={Truck}
          label="Mutasi Berjalan"
          value={summary?.transfers_in_transit ?? 0}
          sub={
            (summary?.transfers_in_transit ?? 0) > 0
              ? 'sedang dalam perjalanan'
              : 'Tidak ada mutasi aktif'
          }
          accent="text-violet-400"
          href="/operations/transfers"
          isLoading={isLoading}
        />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Main 2-column grid: Activity Feed + Notification Center             */}
      {/* ------------------------------------------------------------------ */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-card border border-border rounded-xl p-5 shadow-lg">
          <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Clock className="h-4 w-4 text-amber-500" />
            Aktivitas Terbaru
          </h3>
          {isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-11 rounded-lg bg-slate-800/70 animate-pulse" />
              ))}
            </div>
          ) : !summary?.recent_transactions.length ? (
            <div className="py-10 flex flex-col items-center gap-2 text-center">
              <Clock className="h-8 w-8 text-slate-700" />
              <p className="text-sm text-slate-500">Belum ada aktivitas hari ini</p>
              <p className="text-[11px] text-slate-600">Transaksi pertama akan muncul di sini</p>
            </div>
          ) : (
            <div>
              {summary.recent_transactions.map((tx, idx) => (
                <motion.div
                  key={tx.transaction_id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                >
                  <ActivityRow tx={tx} />
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Notification Center */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-lg flex flex-col gap-4">
          <h3 className="font-semibold text-white flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Perhatian
          </h3>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-lg bg-slate-800 animate-pulse" />)}
            </div>
          ) : allClear ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex flex-col items-center gap-2 py-6 text-center"
            >
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm font-medium text-emerald-400">Semua berjalan normal</p>
              <p className="text-xs text-slate-500">Tidak ada item yang memerlukan perhatian</p>
            </motion.div>
          ) : (
            <div className="space-y-2">
              {(notifications?.low_stock_count ?? 0) > 0 && (
                <NotificationItem
                  icon={AlertTriangle}
                  count={notifications!.low_stock_count}
                  label="Stok menipis"
                  href="/reports/low-stock"
                  urgency="high"
                />
              )}
              {(notifications?.transfers_awaiting_receipt ?? 0) > 0 && (
                <NotificationItem
                  icon={Truck}
                  count={notifications!.transfers_awaiting_receipt}
                  label="Menunggu penerimaan"
                  href="/operations/transfers"
                  urgency="medium"
                />
              )}
              {(notifications?.overdue_opname_sessions ?? 0) > 0 && (
                <NotificationItem
                  icon={ClipboardList}
                  count={notifications!.overdue_opname_sessions}
                  label="Opname tertunda"
                  href="/operations/stock-opname"
                  urgency="low"
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Quick Actions                                                        */}
      {/* ------------------------------------------------------------------ */}
      <div className="bg-card border border-border rounded-xl p-5 shadow-lg">
        <h3 className="font-semibold text-white mb-4 text-sm uppercase tracking-wider text-slate-400">
          Aksi Cepat
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { icon: Archive,       label: 'Stok Masuk',   href: '/operations/stock-in',      color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20 hover:border-amber-500/50' },
            { icon: ShoppingCart,  label: 'Barang Keluar', href: '/operations/outbound',     color: 'text-sky-400',    bg: 'bg-sky-500/10 border-sky-500/20 hover:border-sky-500/50'       },
            { icon: ArrowLeftRight,label: 'Mutasi Baru',   href: '/operations/transfers/new', color: 'text-violet-400', bg: 'bg-violet-500/10 border-violet-500/20 hover:border-violet-500/50' },
            { icon: ClipboardList, label: 'Opname Stok',   href: '/operations/stock-opname', color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20 hover:border-emerald-500/50' },
          ].map(({ icon: Icon, label, href, color, bg }) => (
            <motion.button
              key={href}
              whileTap={{ scale: 0.97 }}
              onClick={() => navigate(href)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border transition-all min-h-[80px] justify-center ${bg}`}
            >
              <Icon className={`h-6 w-6 ${color}`} />
              <span className={`text-xs font-semibold ${color}`}>{label}</span>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
}
