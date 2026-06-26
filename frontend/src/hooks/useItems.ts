import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface Item {
  item_id: number;
  item_code: string;
  name: string;
  description: string | null;
  category_id: number;
  supplier_id: number;
  uom_id: number;
  minimum_stock: number;
  image_url: string | null;
  image_path: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    category_id: number;
    name: string;
    code_prefix: string;
  };
  supplier?: {
    supplier_id: number;
    name: string;
    code_prefix: string;
  };
  uom?: {
    uom_id: number;
    name: string;
  };
}

export interface ItemsResponse {
  data: Item[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface ItemFilters {
  page?: number;
  page_size?: number;
  category_id?: number | null;
  supplier_id?: number | null;
  q?: string;
  is_active?: boolean | null;
}

export interface ItemCreate {
  name: string;
  description?: string | null;
  category_id: number;
  supplier_id: number;
  uom_id: number;
  manual_code: string;
  minimum_stock: number;
}

export interface ItemUpdate {
  name: string;
  description?: string | null;
  minimum_stock: number;
}

export const useItems = (filters: ItemFilters = {}) => {
  return useQuery({
    queryKey: ['items', filters],
    queryFn: async (): Promise<ItemsResponse> => {
      const params = new URLSearchParams();
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.page_size !== undefined) params.append('page_size', filters.page_size.toString());
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
      if (filters.q) params.append('q', filters.q);
      if (filters.is_active !== undefined && filters.is_active !== null) {
        params.append('is_active', filters.is_active.toString());
      }
      
      const response = await api.get('/items/', { params });
      return response.data;
    },
  });
};

export const useItem = (id: number) => {
  return useQuery({
    queryKey: ['items', id],
    queryFn: async (): Promise<Item> => {
      const response = await api.get(`/items/${id}`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: ItemCreate): Promise<Item> => {
      const response = await api.post('/items/', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
    },
  });
};

export const useUpdateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: number; data: ItemUpdate }): Promise<Item> => {
      const response = await api.put(`/items/${id}`, data);
      return response.data;
    },
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', updatedItem.item_id] });
    },
  });
};

export const useDeactivateItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: number): Promise<Item> => {
      const response = await api.patch(`/items/${id}/deactivate`);
      return response.data;
    },
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', updatedItem.item_id] });
    },
  });
};

export const useUploadItemImage = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, file }: { id: number; file: File }): Promise<Item> => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post(`/items/${id}/image`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    },
    onSuccess: (updatedItem) => {
      queryClient.invalidateQueries({ queryKey: ['items'] });
      queryClient.invalidateQueries({ queryKey: ['items', updatedItem.item_id] });
    },
  });
};

export const useLookupItem = () => {
  return useMutation({
    mutationFn: async (itemCode: string): Promise<Item> => {
      const response = await api.get('/items/lookup', {
        params: { item_code: itemCode },
      });
      return response.data;
    },
  });
};

// ---------------------------------------------------------------------------
// Phase 6 — Frequent Items Carousel (read-only analytics)
// ---------------------------------------------------------------------------

/** Shape of a single entry returned by GET /items/frequent */
export interface FrequentItemEntry {
  item_id: number;
  item_code: string;
  name: string;
  image_url: string | null;
  transaction_count: number;  // COUNT(*) — primary rank signal
  total_quantity: number;     // SUM(quantity) — secondary rank signal
  category?: {
    category_id: number;
    name: string;
    code_prefix: string;
  };
  supplier?: {
    supplier_id: number;
    name: string;
    code_prefix: string;
  };
}

/** Response envelope for GET /items/frequent */
export interface FrequentItemsResponse {
  data: FrequentItemEntry[];
  branch_id: number | null;
  /**
   * Forward-compatibility: identifies which carousel variant this response
   * belongs to. Currently always "frequent". A future "recent" carousel will
   * use a distinct carousel_type without requiring API architecture changes.
   */
  carousel_type: string;
}

/**
 * Fetches the current user's most frequently handled items for the given
 * branch over the last 30 days. Returns empty when branchId is falsy so the
 * carousel can be hidden without extra conditional logic at the call site.
 *
 * @param branchId  Active branch. Pass null/undefined to disable the query.
 * @param limit     Number of items to request (default 12).
 */
export const useFrequentItems = (
  branchId: number | null | undefined,
  limit = 12,
) => {
  return useQuery({
    queryKey: ['items', 'frequent', branchId, limit],
    queryFn: async (): Promise<FrequentItemsResponse> => {
      const params = new URLSearchParams();
      if (branchId) params.append('branch_id', branchId.toString());
      params.append('limit', limit.toString());
      const response = await api.get('/items/frequent', { params });
      return response.data;
    },
    // Only fire when a branch is actually selected.
    // When branchId is null/undefined the query stays idle and returns
    // { data: undefined } — the carousel simply won't render.
    enabled: !!branchId,
    staleTime: 5 * 60 * 1000, // 5 minutes — matches approved spec
  });
};
