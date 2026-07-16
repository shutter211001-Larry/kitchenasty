import useSWR, { preload } from 'swr';
import { api } from '../lib/api';

interface UseApiResult<T> {
  data: T | null;
  error: string | null;
  isLoading: boolean;
  refetch: () => void;
}

const fetcher = (url: string) => api.get<any>(url).then(res => res.data || res);

export function preloadApi(url: string, customFetcher?: (url: string) => Promise<any>) {
  preload(url, customFetcher || fetcher);
}

export function useApi<T>(url: string | null, customFetcher?: (url: string) => Promise<any>): UseApiResult<T> {
  const finalFetcher = customFetcher || fetcher;
  const { data, error, isLoading, mutate } = useSWR<T>(url, url ? finalFetcher : null, {
    revalidateOnFocus: false, // Don't aggressively revalidate on tab focus to save bandwidth
    keepPreviousData: true,   // Keep old data while fetching new to prevent UI flashing
  });

  return { 
    data: data || null, 
    error: error?.message || null, 
    isLoading, 
    refetch: () => mutate() 
  };
}
