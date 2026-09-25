import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function useMedicineRequests(accessToken) {
  return useQuery({
    queryKey: queryKeys.medicineRequests,

    queryFn: async () => {
      const response = await apiRequest('/medicine-requests', {
        token: accessToken,
      })

      /*
       * Normalize the medicine request response.
       *
       * Supports:
       *   { data: [...] }
       *   { data: { requests: [...] } }
       *   { data: { medicineRequests: [...] } }
       *   { requests: [...] }
       *   { medicineRequests: [...] }
       */
      const medicineRequests = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.requests)
          ? response.data.requests
          : Array.isArray(response?.data?.medicineRequests)
            ? response.data.medicineRequests
            : Array.isArray(response?.requests)
              ? response.requests
              : Array.isArray(response?.medicineRequests)
                ? response.medicineRequests
                : []

      return medicineRequests
    },

    /*
     * Only fetch customer medicine requests when
     * an authenticated access token is available.
     */
    enabled: Boolean(accessToken),

    /*
     * Medicine request status can be changed by the
     * pharmacy admin, so keep this cache relatively fresh.
     */
    staleTime: 30 * 1000,
  })
}