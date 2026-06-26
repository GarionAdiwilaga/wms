import { cn } from '../../lib/utils';

/** All transaction_type values in the immutable ledger */
export type TxType =
  | 'IN'
  | 'OUT'
  | 'TRANSFER_IN'
  | 'TRANSFER_OUT'
  | 'ADJUSTMENT_PLUS'
  | 'ADJUSTMENT_MINUS'
  | 'OPNAME';

interface TxTypeBadgeProps {
  type: string;
  className?: string;
  /** 'badge' = pill with bg color (default). 'dot' = small colored dot + label. */
  variant?: 'badge' | 'dot';
}

const TYPE_MAP: Record<string, { label: string; color: string; dot: string }> = {
  IN:               { label: 'Stok Masuk',       color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30', dot: 'bg-emerald-400' },
  OUT:              { label: 'Barang Keluar',     color: 'bg-red-500/15 text-red-400 border-red-500/30',            dot: 'bg-red-400'     },
  TRANSFER_IN:      { label: 'Transfer Masuk',    color: 'bg-sky-500/15 text-sky-400 border-sky-500/30',            dot: 'bg-sky-400'     },
  TRANSFER_OUT:     { label: 'Transfer Keluar',   color: 'bg-orange-500/15 text-orange-400 border-orange-500/30',   dot: 'bg-orange-400'  },
  ADJUSTMENT_PLUS:  { label: 'Penyesuaian (+)',   color: 'bg-violet-500/15 text-violet-400 border-violet-500/30',   dot: 'bg-violet-400'  },
  ADJUSTMENT_MINUS: { label: 'Penyesuaian (-)',   color: 'bg-rose-500/15 text-rose-400 border-rose-500/30',         dot: 'bg-rose-400'    },
  OPNAME:           { label: 'Opname',            color: 'bg-slate-500/15 text-slate-400 border-slate-500/30',      dot: 'bg-slate-400'   },
};

const FALLBACK = { label: 'Transaksi', color: 'bg-slate-500/15 text-slate-400 border-slate-500/30', dot: 'bg-slate-400' };

/**
 * Renders a consistent color-coded badge for a ledger transaction type.
 * Accepts any string — gracefully falls back for unknown types.
 *
 * Usage:
 *   <TxTypeBadge type="TRANSFER_IN" />
 *   <TxTypeBadge type={row.transaction_type} variant="dot" />
 */
export function TxTypeBadge({ type, className, variant = 'badge' }: TxTypeBadgeProps) {
  const config = TYPE_MAP[type] ?? FALLBACK;

  if (variant === 'dot') {
    return (
      <span className={cn('flex items-center gap-1.5', className)}>
        <span className={cn('h-2 w-2 flex-shrink-0 rounded-full', config.dot)} />
        <span className="text-xs text-slate-300">{config.label}</span>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        config.color,
        className,
      )}
    >
      {config.label}
    </span>
  );
}
