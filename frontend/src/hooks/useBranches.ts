import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Branch {
  branch_id: number;
  code: string;
  name: string;
  location: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export type BranchCreate = Pick<Branch, 'code' | 'name' | 'location' | 'is_active'>;
export type BranchUpdate = Partial<BranchCreate>;

export const useBranches = () => {
  return useQuery({
    queryKey: ['branches'],
    queryFn: async (): Promise<Branch[]> => {
      const response = await api.get('/branches/');
      return response.data;
    },
  });
};

export const useCreateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: BranchCreate) => {
      const response = await api.post('/branches/', data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
};

export const useUpdateBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: BranchUpdate }) => {
      const response = await api.put(`/branches/${id}`, data);
      return response.data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
};

export const useDeleteBranch = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/branches/${id}`);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['branches'] }),
  });
};
