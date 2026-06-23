import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface TransferLineCreate {
  item_id: number;
  sent_quantity: number;
}

export interface TransferCreate {
  source_branch_id: number;
  dest_branch_id: number;
  notes?: string | null;
  lines: TransferLineCreate[];
}

export interface TransferLineUpdate {
  line_id?: number;
  item_id: number;
  sent_quantity: number;
}

export interface TransferUpdate {
  dest_branch_id?: number;
  notes?: string | null;
  lines?: TransferLineUpdate[];
}

export interface TransferLineReceive {
  line_id: number;
  received_quantity: number;
  variance_notes?: string | null;
  variance_reason?: string | null;
}

export interface TransferReceive {
  received_notes?: string | null;
  lines: TransferLineReceive[];
}

export interface TransferCancel {
  cancellation_reason: string;
}

export interface TransferLine {
  line_id: number;
  transfer_id: number;
  item_id: number;
  sent_quantity: number;
  received_quantity: number | null;
  variance_notes: string | null;
  variance_reason: string | null;
  created_at: string;
  item_code?: string;
  item_name?: string;
}

export interface Transfer {
  transfer_id: number;
  transfer_number: string;
  source_branch_id: number;
  dest_branch_id: number;
  status: 'draft' | 'in_transit' | 'received' | 'cancelled';
  notes: string | null;
  received_notes: string | null;
  created_by: number;
  shipped_at: string | null;
  shipped_by: number | null;
  received_at: string | null;
  received_by: number | null;
  cancelled_at: string | null;
  cancelled_by: number | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  lines: TransferLine[];
  source_branch_name?: string;
  dest_branch_name?: string;
}

export interface PaginatedTransfers {
  data: Transfer[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface TransferFilters {
  branch_id?: number | null;
  status?: string | null;
  page?: number;
  page_size?: number;
}

export const useTransfers = (filters: TransferFilters = {}) => {
  return useQuery({
    queryKey: ['transfers', filters],
    queryFn: async (): Promise<PaginatedTransfers> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.status) params.append('status', filters.status);
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.page_size !== undefined) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/transfers/', { params });
      return response.data;
    },
  });
};

export const useTransfer = (id: number) => {
  return useQuery({
    queryKey: ['transfers', id],
    queryFn: async (): Promise<Transfer> => {
      const response = await api.get(`/transfers/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TransferCreate): Promise<Transfer> => {
      const response = await api.post('/transfers/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
    },
  });
};

export const useUpdateTransfer = (id: number) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: TransferUpdate): Promise<Transfer> => {
      const response = await api.put(`/transfers/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers', id] });
    },
  });
};

export const useShipTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<Transfer> => {
      const response = await api.post(`/transfers/${id}/ship`);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers', data.transfer_id] });
      queryClient.invalidateQueries({ queryKey: ['branch-stocks'] });
    },
  });
};

export const useReceiveTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TransferReceive }): Promise<Transfer> => {
      const response = await api.post(`/transfers/${id}/receive`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers', data.transfer_id] });
      queryClient.invalidateQueries({ queryKey: ['branch-stocks'] });
    },
  });
};

export const useCancelTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TransferCancel }): Promise<Transfer> => {
      const response = await api.post(`/transfers/${id}/cancel`, data);
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['transfers'] });
      queryClient.invalidateQueries({ queryKey: ['transfers', data.transfer_id] });
      queryClient.invalidateQueries({ queryKey: ['branch-stocks'] });
    },
  });
};
