import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function useReservations() {
  return useQuery({
    queryKey: queryKeys.reservations,

    queryFn: async () => {
      const reservations =
        await api.getMyReservations()

      return Array.isArray(reservations)
        ? reservations
        : []
    },

    // Reservation statuses can change when the
    // pharmacy processes the reservation.
    staleTime: 30 * 1000,
  })
}