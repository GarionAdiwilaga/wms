import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface StockInLineCreate {
  item_id: number;
  quantity: number;
}

export interface StockInCreate {
  branch_id: number;
  status?: string;
  reference_no?: string | null;
  supplier_invoice_no?: string | null;
  transaction_date?: string | null;
  notes?: string | null;
  lines: StockInLineCreate[];
}

export interface StockInLine {
  line_id: number;
  session_id: number;
  item_id: number;
  quantity: number;
  created_at: string;
  item_code?: string;
  item_name?: string;
}

export interface StockInSession {
  session_id: number;
  branch_id: number;
  status: string;
  reference_no: string | null;
  supplier_invoice_no: string | null;
  transaction_date: string;
  notes: string | null;
  created_by: number;
  received_by: number | null;
  created_at: string;
  updated_at: string;
  lines: StockInLine[];
  branch_name?: string; // Loaded client-side or from API
}

export interface PaginatedStockIn {
  data: StockInSession[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StockInFilters {
  branch_id?: number | null;
  status?: string | null;
  page?: number;
  page_size?: number;
}

export const useStockInSessions = (filters: StockInFilters = {}) => {
  return useQuery({
    queryKey: ['stock-in', filters],
    queryFn: async (): Promise<PaginatedStockIn> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.page_size !== undefined) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/stock-in/', { params });
      return response.data;
    },
  });
};

export const useStockInSession = (id: number) => {
  return useQuery({
    queryKey: ['stock-in', id],
    queryFn: async (): Promise<StockInSession> => {
      const response = await api.get(`/stock-in/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateStockIn = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StockInCreate): Promise<StockInSession> => {
      const response = await api.post('/stock-in/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-in'] });
      queryClient.invalidateQueries({ queryKey: ['branch-stocks'] });
    },
  });
};
