import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';

const rawApiUrl = import.meta.env.VITE_API_URL_PUBLIC || '';
const API_URL = rawApiUrl.startsWith('http') ? rawApiUrl : `https://${rawApiUrl}`;
const API_BASE = `${API_URL.replace(/\/$/, '')}/api`;

const getTenantId = () => {
  const saved = localStorage.getItem('tenantId');
  if (saved) return saved;
  const hostname = window.location.hostname;
  if (hostname !== 'localhost' && hostname !== '127.0.0.1') {
    const parts = hostname.split('.');
    if (parts.length >= 3 && parts[0] !== 'www' && parts[0] !== 'admin') {
      return parts[0];
    }
  }
  return '';
};

export const apiSlice = createApi({
  reducerPath: 'api',
  baseQuery: fetchBaseQuery({
    baseUrl: API_BASE,
    prepareHeaders: (headers) => {
      const token = localStorage.getItem('token');
      const tenantId = getTenantId();
      const domain = window.location.hostname;

      if (tenantId) headers.set('x-tenant-id', tenantId);
      headers.set('x-tenant-domain', domain);
      if (token) headers.set('Authorization', `Bearer ${token}`);
      
      return headers;
    },
  }),
  tagTypes: ['Category', 'MenuItem', 'Order'],
  endpoints: (builder) => ({
    getCategories: builder.query<any[], void>({
      query: () => '/menu/categories',
      transformResponse: (res: { success: boolean; data: any[] }) => res.data || [],
      providesTags: ['Category'],
    }),
    getMenuItems: builder.query<any[], void>({
      query: () => '/menu/items',
      transformResponse: (res: { success: boolean; data: any[] }) => res.data || [],
      providesTags: ['MenuItem'],
    }),
  }),
});

export const { useGetCategoriesQuery, useGetMenuItemsQuery } = apiSlice;
