import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface UOM {
  uom_id: number;
  code: string;
  name: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type UOMCreate = Pick<UOM, 'code' | 'name' | 'is_active'>;
export type UOMUpdate = Partial<UOMCreate>;

export const useUOMs = () => {
  return useQuery({
    queryKey: ['uoms'],
    queryFn: async (): Promise<UOM[]> => {
      const response = await api.get('/uom/');
      return response.data;
    },
  });
};

export const useCreateUOM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: UOMCreate) => {
      const response = await api.post('/uom/', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uoms'] }),
  });
};

export const useUpdateUOM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: UOMUpdate }) => {
      const response = await api.put(`/uom/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uoms'] }),
  });
};

export const useDeleteUOM = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/uom/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['uoms'] }),
  });
};
