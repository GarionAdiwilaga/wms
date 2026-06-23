import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface OutboundLineCreate {
  item_id: number;
  quantity: number;
}

export interface OutboundCreate {
  branch_id: number;
  status?: string;
  reference_no: string;
  transaction_date?: string | null;
  notes?: string | null;
  lines: OutboundLineCreate[];
}

export interface OutboundLine {
  line_id: number;
  session_id: number;
  item_id: number;
  quantity: number;
  created_at: string;
  item_code?: string;
  item_name?: string;
}

export interface OutboundSession {
  session_id: number;
  branch_id: number;
  status: string;
  reference_no: string | null;
  transaction_date: string;
  notes: string | null;
  created_by: number;
  fulfilled_by: number | null;
  created_at: string;
  updated_at: string;
  lines: OutboundLine[];
  branch_name?: string; // Loaded client-side or from API
}

export interface PaginatedOutbound {
  data: OutboundSession[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface OutboundFilters {
  branch_id?: number | null;
  status?: string | null;
  page?: number;
  page_size?: number;
}

export const useOutboundSessions = (filters: OutboundFilters = {}) => {
  return useQuery({
    queryKey: ['outbound', filters],
    queryFn: async (): Promise<PaginatedOutbound> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.page_size !== undefined) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/outbound/', { params });
      return response.data;
    },
  });
};

export const useOutboundSession = (id: number) => {
  return useQuery({
    queryKey: ['outbound', id],
    queryFn: async (): Promise<OutboundSession> => {
      const response = await api.get(`/outbound/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateOutbound = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: OutboundCreate): Promise<OutboundSession> => {
      const response = await api.post('/outbound/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['outbound'] });
      queryClient.invalidateQueries({ queryKey: ['branch-stocks'] });
    },
  });
};
