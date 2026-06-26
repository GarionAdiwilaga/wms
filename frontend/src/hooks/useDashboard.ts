import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface StockInTodaySummary {
  session_count: number;
  total_units: number;
}

export interface OutboundTodaySummary {
  session_count: number;
  total_units: number;
}

export interface RecentTransaction {
  transaction_id: number;
  transaction_type: string; // raw ledger value: 'IN', 'OUT', 'ADJUSTMENT_PLUS', etc.
  reference_type: string;   // 'stock_in' | 'outbound' | 'transfer' | 'opname' | ...
  item_name: string;
  item_code: string;
  quantity: number;
  branch_name: string;
  operator_name: string;
  created_at: string; // ISO-8601
}

export interface DashboardNotifications {
  low_stock_count: number;
  transfers_awaiting_receipt: number;
  overdue_opname_sessions: number;
}

export interface DashboardSummaryResponse {
  branch_id: number | null;
  branch_name: string | null;
  date: string;
  stock_in_today: StockInTodaySummary;
  outbound_today: OutboundTodaySummary;
  transfers_in_transit: number;
  recent_transactions: RecentTransaction[];
  notifications: DashboardNotifications;
}

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Fetches the operational dashboard summary for the given branch.
 *
 * Refresh strategy (per approved design):
 *   - staleTime: 2 minutes  — avoids re-fetching on every navigation
 *   - refetchOnWindowFocus: true  — auto-refreshes when tab is re-activated
 *   - No polling
 *
 * RBAC: the backend enforces branch scoping for non-super_admin users.
 * Passing `branchId=null` as super_admin returns a cross-branch aggregate.
 */
export const useDashboardSummary = (branchId: number | null | undefined) => {
  return useQuery({
    queryKey: ['dashboard', 'summary', branchId],
    queryFn: async (): Promise<DashboardSummaryResponse> => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', branchId.toString());
      const response = await api.get('/dashboard/summary', { params });
      return response.data;
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
    refetchOnWindowFocus: true,
  });
};
