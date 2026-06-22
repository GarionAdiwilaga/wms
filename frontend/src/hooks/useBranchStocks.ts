import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface BranchStock {
  branch_id: number;
  item_id: number;
  quantity: number;
  updated_at: string;
  item_code?: string;
  item_name?: string;
  category_name?: string;
  supplier_name?: string;
  uom_name?: string;
  minimum_stock?: number;
}

export interface PaginatedBranchStock {
  data: BranchStock[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface BranchStockFilters {
  branch_id?: number | null;
  category_id?: number | null;
  supplier_id?: number | null;
  search?: string;
  low_stock_only?: boolean;
  page?: number;
  page_size?: number;
}

export const useBranchStocks = (filters: BranchStockFilters = {}) => {
  return useQuery({
    queryKey: ['branch-stocks', filters],
    queryFn: async (): Promise<PaginatedBranchStock> => {
      const params = new URLSearchParams();
      if (filters.branch_id) params.append('branch_id', filters.branch_id.toString());
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.low_stock_only !== undefined) {
        params.append('low_stock_only', filters.low_stock_only.toString());
      }
      if (filters.page !== undefined) params.append('page', filters.page.toString());
      if (filters.page_size !== undefined) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/branch-stocks/', { params });
      return response.data;
    },
  });
};
