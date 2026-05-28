import { useMutation, useQuery, type UseMutationOptions, type UseQueryOptions } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";

export function useApiQuery<T>(
  queryKey: string[],
  url: string,
  options?: Omit<UseQueryOptions<T, Error>, "queryKey" | "queryFn">
) {
  return useQuery<T, Error>({
    queryKey,
    queryFn: () => apiClient.get<T>(url),
    ...options,
  });
}

export function useApiMutation<T, TData = unknown, TError = Error>(
  mutationFn: (data: TData) => Promise<T>,
  options?: Omit<UseMutationOptions<T, TError, TData>, "mutationFn">
) {
  return useMutation<T, TError, TData>({
    mutationFn,
    ...options,
  });
}

export const api = {
  get: <T>(url: string) => apiClient.get<T>(url),
  post: <T>(url: string, data?: unknown) => apiClient.post<T>(url, data),
  put: <T>(url: string, data?: unknown) => apiClient.put<T>(url, data),
  patch: <T>(url: string, data?: unknown) => apiClient.patch<T>(url, data),
  delete: <T>(url: string) => apiClient.delete<T>(url),
};
