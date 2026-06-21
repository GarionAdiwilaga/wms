import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Supplier {
  supplier_id: number;
  code: string;
  name: string;
  contact_info: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type SupplierCreate = Pick<Supplier, 'code' | 'name' | 'contact_info' | 'is_active'>;
export type SupplierUpdate = Partial<SupplierCreate>;

export const useSuppliers = () => {
  return useQuery({
    queryKey: ['suppliers'],
    queryFn: async (): Promise<Supplier[]> => {
      const response = await api.get('/suppliers/');
      return response.data;
    },
  });
};

export const useCreateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: SupplierCreate) => {
      const response = await api.post('/suppliers/', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useUpdateSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: SupplierUpdate }) => {
      const response = await api.put(`/suppliers/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};

export const useDeleteSupplier = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/suppliers/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['suppliers'] }),
  });
};
