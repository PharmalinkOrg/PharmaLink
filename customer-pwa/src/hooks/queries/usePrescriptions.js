import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function usePrescriptions(accessToken) {
  return useQuery({
    queryKey: queryKeys.prescriptions,

    queryFn: async () => {
      const response = await apiRequest('/prescriptions', {
        token: accessToken,
      })

      /*
       * Normalize the prescription response.
       *
       * Supports:
       *   { data: [...] }
       *   { data: { prescriptions: [...] } }
       *   { prescriptions: [...] }
       */
      const prescriptions = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.prescriptions)
          ? response.data.prescriptions
          : Array.isArray(response?.prescriptions)
            ? response.prescriptions
            : []

      return prescriptions
    },

    /*
     * Only fetch prescription information when the
     * customer has an authenticated session.
     */
    enabled: Boolean(accessToken),

    /*
     * Prescription status may be changed by a pharmacy,
     * so we don't want to cache it for too long.
     *
     * Keep it fresh for 60 seconds.
     */
    staleTime: 60 * 1000,
  })
}