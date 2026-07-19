import { useApi } from './useApi.js';
import { API_BASE } from '../lib/api.js';

export interface Location {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  status: 'ACTIVE' | 'INACTIVE';
  allowPickup: boolean;
  allowDelivery: boolean;
  allowDineIn: boolean;
  openTime: string | null;
  closeTime: string | null;
}

export function useLocations() {
  const { data: response, isLoading, error } = useApi<{ data: Location[] }>(`${API_BASE}/locations`);

  return {
    locations: response?.data || [],
    isLoading,
    error,
  };
}
