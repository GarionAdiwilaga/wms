import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface StockReportRow {
  branch_name: string;
  item_code: string;
  item_name: string;
  category_name: string;
  supplier_name: string;
  quantity: number;
  minimum_stock: number;
}

export interface StockReportResponse {
  data: StockReportRow[];
  total: number;
}

export interface LowStockReportRow {
  branch_name: string;
  item_code: string;
  item_name: string;
  category_name: string;
  supplier_name: string;
  quantity: number;
  minimum_stock: number;
  shortage: number;
}

export interface LowStockReportResponse {
  data: LowStockReportRow[];
  total: number;
}

export interface ItemHistoryReportRow {
  transaction_id: number;
  created_at: string;
  branch_name: string;
  transaction_type: string;
  quantity: number;
  reference_type: string;
  reference_id: number | null;
  document_no: string | null;
  notes: string | null;
  operator_name: string;
}

export interface ItemHistoryReportResponse {
  data: ItemHistoryReportRow[];
  total: number;
}

export interface InventoryMovementReportRow {
  transaction_id: number;
  created_at: string;
  branch_name: string;
  item_code: string;
  item_name: string;
  transaction_type: string;
  quantity: number;
  balance_after: number;
  reference_type: string;
  reference_id: number | null;
  document_no: string | null;
  notes: string | null;
  operator_name: string;
}

export interface InventoryMovementReportResponse {
  data: InventoryMovementReportRow[];
  total: number;
}

export interface TransferVarianceReportRow {
  transfer_number: string;
  source_branch_name: string;
  dest_branch_name: string;
  received_at: string;
  item_code: string;
  item_name: string;
  sent_quantity: number;
  received_quantity: number;
  variance: number;
  variance_reason: string | null;
  variance_notes: string | null;
  receiver_name: string;
}

export interface TransferVarianceReportSummary {
  total_transfers: number;
  transfers_with_variance: number;
  total_lost_units: number;
}

export interface TransferVarianceReportResponse {
  data: TransferVarianceReportRow[];
  total: number;
  summary: TransferVarianceReportSummary;
}

export interface AuditLogReportRow {
  log_id: number;
  created_at: string;
  operator_name: string;
  action: string;
  entity_type: string;
  entity_id: number;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
}

export interface AuditLogReportResponse {
  data: AuditLogReportRow[];
  total: number;
}

export interface ReportFilters {
  branch_id?: number | null;
  category_id?: number | null;
  supplier_id?: number | null;
  user_id?: number | null;
  action?: string | null;
  entity_type?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  search?: string;
  page?: number;
  page_size?: number;
}

// Helpers to format dates to full datetime ISO-like strings
const formatStartDate = (dateStr?: string | null) => {
  if (!dateStr) return undefined;
  return `${dateStr}T00:00:00`;
};

const formatEndDate = (dateStr?: string | null) => {
  if (!dateStr) return undefined;
  return `${dateStr}T23:59:59`;
};

export const useStockReport = (filters: ReportFilters = {}) => {
  return useQuery({
    queryKey: ['reports-stock', filters],
    queryFn: async (): Promise<StockReportResponse> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/reports/stock', { params });
      return response.data;
    },
  });
};

export const useLowStockReport = (filters: ReportFilters = {}) => {
  return useQuery({
    queryKey: ['reports-low-stock', filters],
    queryFn: async (): Promise<LowStockReportResponse> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/reports/low-stock', { params });
      return response.data;
    },
  });
};

export const useItemHistoryReport = (itemId: number | null, filters: ReportFilters = {}) => {
  return useQuery({
    queryKey: ['reports-item-history', itemId, filters],
    queryFn: async (): Promise<ItemHistoryReportResponse> => {
      if (!itemId) return { data: [], total: 0 };
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      const sDate = formatStartDate(filters.start_date);
      const eDate = formatEndDate(filters.end_date);
      if (sDate) params.append('start_date', sDate);
      if (eDate) params.append('end_date', eDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await api.get(`/reports/item-history/${itemId}`, { params });
      return response.data;
    },
    enabled: !!itemId,
  });
};

export const useInventoryMovementReport = (filters: ReportFilters = {}) => {
  return useQuery({
    queryKey: ['reports-movements', filters],
    queryFn: async (): Promise<InventoryMovementReportResponse> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
      const sDate = formatStartDate(filters.start_date);
      const eDate = formatEndDate(filters.end_date);
      if (sDate) params.append('start_date', sDate);
      if (eDate) params.append('end_date', eDate);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/reports/movements', { params });
      return response.data;
    },
  });
};

export const useTransferVarianceReport = (filters: ReportFilters = {}) => {
  return useQuery({
    queryKey: ['reports-transfer-variance', filters],
    queryFn: async (): Promise<TransferVarianceReportResponse> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      const sDate = formatStartDate(filters.start_date);
      const eDate = formatEndDate(filters.end_date);
      if (sDate) params.append('start_date', sDate);
      if (eDate) params.append('end_date', eDate);
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/reports/transfer-variance', { params });
      return response.data;
    },
  });
};

export const useAuditLogReport = (filters: ReportFilters = {}) => {
  return useQuery({
    queryKey: ['reports-audit-logs', filters],
    queryFn: async (): Promise<AuditLogReportResponse> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.user_id) params.append('user_id', filters.user_id.toString());
      if (filters.action) params.append('action', filters.action);
      if (filters.entity_type) params.append('entity_type', filters.entity_type);
      const sDate = formatStartDate(filters.start_date);
      const eDate = formatEndDate(filters.end_date);
      if (sDate) params.append('start_date', sDate);
      if (eDate) params.append('end_date', eDate);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/reports/audit-logs', { params });
      return response.data;
    },
  });
};
