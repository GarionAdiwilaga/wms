import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';

export interface MovementVelocityEntry {
  item_id: number;
  item_code: string;
  item_name: string;
  category_name: string;
  supplier_name: string;
  total_outbound: number;
  velocity: number;
}

export interface MovementVelocityResponse {
  generated_at: string;
  data: MovementVelocityEntry[];
}

export interface ActivityTrendEntry {
  date: string;
  inbound: number;
  outbound: number;
  transfers: number;
}

export interface ActivityTrendResponse {
  generated_at: string;
  data: ActivityTrendEntry[];
}

export interface CategoryDistributionEntry {
  category_id: number;
  category_name: string;
  total_quantity: number;
  item_count: number;
}

export interface BranchDistributionEntry {
  branch_id: number;
  branch_name: string;
  total_quantity: number;
  item_count: number;
}

export interface DistributionsResponse {
  generated_at: string;
  categories: CategoryDistributionEntry[];
  branches: BranchDistributionEntry[] | null;
}

export interface TopOperatorEntry {
  user_id: number;
  operator_name: string;
  total_transactions: number;
  total_units: number;
}

export interface TopOperatorsResponse {
  generated_at: string;
  data: TopOperatorEntry[];
}

export interface MovementClassificationEntry {
  item_id: number;
  item_code: string;
  item_name: string;
  category_name: string;
  supplier_name: string;
  last_movement_date: string | null;
  days_since_last_movement: number | null;
}

export interface MovementClassificationResponse {
  generated_at: string;
  data: MovementClassificationEntry[];
  total: number;
}

export interface ClassificationFilters {
  category_id?: number | null;
  supplier_id?: number | null;
  search?: string;
  page?: number;
  page_size?: number;
}

export const useMovementVelocity = (branchId: number | null = null, days: number = 30) => {
  return useQuery({
    queryKey: ['analytics-velocity', branchId, days],
    queryFn: async (): Promise<MovementVelocityResponse> => {
      const params = new URLSearchParams();
      if (branchId !== null) params.append('branch_id', branchId.toString());
      params.append('days', days.toString());
      const response = await api.get('/analytics/velocity', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });
};

export const useActivityTrends = (branchId: number | null = null, days: number = 30) => {
  return useQuery({
    queryKey: ['analytics-trends', branchId, days],
    queryFn: async (): Promise<ActivityTrendResponse> => {
      const params = new URLSearchParams();
      if (branchId !== null) params.append('branch_id', branchId.toString());
      params.append('days', days.toString());
      const response = await api.get('/analytics/trends', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useDistributions = (branchId: number | null = null) => {
  return useQuery({
    queryKey: ['analytics-distributions', branchId],
    queryFn: async (): Promise<DistributionsResponse> => {
      const params = new URLSearchParams();
      if (branchId !== null) params.append('branch_id', branchId.toString());
      const response = await api.get('/analytics/distributions', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useTopOperators = (branchId: number | null = null, days: number = 30) => {
  return useQuery({
    queryKey: ['analytics-operators', branchId, days],
    queryFn: async (): Promise<TopOperatorsResponse> => {
      const params = new URLSearchParams();
      if (branchId !== null) params.append('branch_id', branchId.toString());
      params.append('days', days.toString());
      const response = await api.get('/analytics/operators', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};

export const useMovementClassification = (branchId: number | null = null, filters: ClassificationFilters = {}) => {
  return useQuery({
    queryKey: ['analytics-classification', branchId, filters],
    queryFn: async (): Promise<MovementClassificationResponse> => {
      const params = new URLSearchParams();
      if (branchId !== null) params.append('branch_id', branchId.toString());
      if (filters.category_id) params.append('category_id', filters.category_id.toString());
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.page_size) params.append('page_size', filters.page_size.toString());

      const response = await api.get('/analytics/classification', { params });
      return response.data;
    },
    staleTime: 5 * 60 * 1000,
  });
};
