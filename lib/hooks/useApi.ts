/**
 * Custom hooks for API calls
 * Provides consistent error handling and loading states
 */

import { useState, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: any;
  headers?: Record<string, string>;
}

interface UseApiResult<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  execute: (url: string, options?: ApiOptions) => Promise<T | null>;
  reset: () => void;
}

/**
 * Custom hook for making API calls with authentication
 */
export function useApi<T = any>(): UseApiResult<T> {
  const { user } = useAuth();
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async (url: string, options: ApiOptions = {}) => {
    if (!user) {
      setError('Not authenticated');
      return null;
    }

    setLoading(true);
    setError(null);

    try {
      const { method = 'GET', body, headers = {} } = options;

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id,
          ...headers,
        },
        ...(body && { body: JSON.stringify(body) }),
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.error || 'API request failed');
      }

      setData(responseData);
      return responseData;
    } catch (err: any) {
      const errorMessage = err.message || 'An unexpected error occurred';
      setError(errorMessage);
      return null;
    } finally {
      setLoading(false);
    }
  }, [user]);

  const reset = useCallback(() => {
    setData(null);
    setError(null);
    setLoading(false);
  }, []);

  return { data, loading, error, execute, reset };
}

/**
 * Hook for fetching products
 */
export function useProducts() {
  const api = useApi();

  const fetchProducts = useCallback(async (status?: string) => {
    const url = status ? `/api/products?status=${status}` : '/api/products';
    return api.execute(url);
  }, [api]);

  return {
    ...api,
    fetchProducts,
  };
}

/**
 * Hook for fetching campaigns
 */
export function useCampaigns() {
  const api = useApi();

  const fetchCampaigns = useCallback(async (params?: {
    status?: string;
    myApplications?: boolean;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.status) searchParams.append('status', params.status);
    if (params?.myApplications) searchParams.append('myApplications', 'true');
    
    const url = `/api/campaigns${searchParams.toString() ? '?' + searchParams.toString() : ''}`;
    return api.execute(url);
  }, [api]);

  return {
    ...api,
    fetchCampaigns,
  };
}

/**
 * Hook for creating/updating products
 */
export function useProductMutation() {
  const api = useApi();

  const createProduct = useCallback(async (productData: any) => {
    return api.execute('/api/products', {
      method: 'POST',
      body: productData,
    });
  }, [api]);

  const updateProduct = useCallback(async (id: string, productData: any) => {
    return api.execute(`/api/products/${id}`, {
      method: 'PUT',
      body: productData,
    });
  }, [api]);

  const deleteProduct = useCallback(async (id: string) => {
    return api.execute(`/api/products/${id}`, {
      method: 'DELETE',
    });
  }, [api]);

  return {
    ...api,
    createProduct,
    updateProduct,
    deleteProduct,
  };
}

/**
 * Hook for creating/updating campaigns
 */
export function useCampaignMutation() {
  const api = useApi();

  const createCampaign = useCallback(async (campaignData: any) => {
    return api.execute('/api/campaigns', {
      method: 'POST',
      body: campaignData,
    });
  }, [api]);

  const updateCampaign = useCallback(async (id: string, campaignData: any) => {
    return api.execute(`/api/campaigns/${id}`, {
      method: 'PUT',
      body: campaignData,
    });
  }, [api]);

  const deleteCampaign = useCallback(async (id: string) => {
    return api.execute(`/api/campaigns/${id}`, {
      method: 'DELETE',
    });
  }, [api]);

  return {
    ...api,
    createCampaign,
    updateCampaign,
    deleteCampaign,
  };
}
