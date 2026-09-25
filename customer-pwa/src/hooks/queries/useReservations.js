import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function useReservations(accessToken) {
  return useQuery({
    queryKey: queryKeys.reservations,

    queryFn: async () => {
      const response = await apiRequest('/reservations', {
        token: accessToken,
      })

      /*
       * Normalize the reservation response.
       *
       * Supports:
       *   { data: [...] }
       *   { data: { reservations: [...] } }
       *   { reservations: [...] }
       */
      const reservations = Array.isArray(response?.data)
        ? response.data
        : Array.isArray(response?.data?.reservations)
          ? response.data.reservations
          : Array.isArray(response?.reservations)
            ? response.reservations
            : []

      return reservations
    },

    /*
     * Only fetch reservations when the customer
     * has an authenticated session.
     */
    enabled: Boolean(accessToken),

    /*
     * Reservation data changes more frequently than
     * profile or pharmacy information because a pharmacy
     * can update a reservation's status.
     *
     * Consider the cached data fresh for 30 seconds.
     */
    staleTime: 30 * 1000,
  })
}