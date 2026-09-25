import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function useAvailableMedicines() {
  return useQuery({
    queryKey: queryKeys.availableMedicines,

    queryFn: async () => {
      const medicines =
        await api.getAvailableMedicines()

      return Array.isArray(medicines)
        ? medicines
        : []
    },

    /*
     * Availability can change when pharmacy inventory changes.
     * Keep this much shorter than pharmacy/profile caching.
     */
    staleTime: 30 * 1000,
  })
}