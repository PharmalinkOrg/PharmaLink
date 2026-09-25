import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Data stays fresh for 1 minute unless a query
      // overrides this value.
      staleTime: 60 * 1000,

      // Keep unused cached data for 10 minutes.
      gcTime: 10 * 60 * 1000,

      // Don't automatically refetch every time the user
      // switches back to the browser window.
      refetchOnWindowFocus: false,

      // Retry failed GET requests once.
      retry: 1,
    },
    mutations: {
      retry: 0,
    },
  },
})