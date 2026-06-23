import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface StockOpnameLineCreate {
  item_id: number;
  physical_quantity: number;
}

export interface StockOpnameCreate {
  branch_id: number;
  category_id: number;
  status?: 'draft' | 'completed';
  notes?: string | null;
  lines: StockOpnameLineCreate[];
}

export interface StockOpnameLineUpdate {
  line_id?: number;
  item_id: number;
  physical_quantity: number;
}

export interface StockOpnameUpdate {
  notes?: string | null;
  lines?: StockOpnameLineUpdate[];
}

export interface StockOpnameLine {
  line_id: number;
  session_id: number;
  item_id: number;
  system_quantity: number;
  physical_quantity: number;
  variance: number;
  created_at: string;
  item_code?: string;
  item_name?: string;
}

export interface StockOpnameSession {
  session_id: number;
  branch_id: number;
  category_id: number;
  status: 'draft' | 'completed';
  notes: string | null;
  created_by: number;
  created_at: string;
  updated_at: string;
  lines: StockOpnameLine[];
  branch_name?: string;
  category_name?: string;
}

export interface PaginatedStockOpnames {
  data: StockOpnameSession[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface StockOpnameFilters {
  branch_id?: number | null;
  status?: string | null;
  page?: number;
  page_size?: number;
}

export const useStockOpnameSessions = (filters: StockOpnameFilters = {}) => {
  return useQuery({
    queryKey: ['stock-opname', filters],
    queryFn: async (): Promise<PaginatedStockOpnames> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.page_size !== undefined) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/stock-opname/', { params });
      return response.data;
    },
  });
};

export const useStockOpnameSession = (id: number) => {
  return useQuery({
    queryKey: ['stock-opname', id],
    queryFn: async (): Promise<StockOpnameSession> => {
      const response = await api.get(`/stock-opname/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateStockOpname = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StockOpnameCreate): Promise<StockOpnameSession> => {
      const response = await api.post('/stock-opname/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
    },
  });
};

export const useUpdateStockOpname = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: StockOpnameUpdate): Promise<StockOpnameSession> => {
      const response = await api.put(`/stock-opname/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opname', id] });
    },
  });
};

export const useCompleteStockOpname = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<StockOpnameSession> => {
      const response = await api.post(`/stock-opname/${id}/complete`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['stock-opname'] });
      queryClient.invalidateQueries({ queryKey: ['stock-opname', data.session_id] });
      queryClient.invalidateQueries({ queryKey: ['branch-stocks'] });
    },
  });
};
