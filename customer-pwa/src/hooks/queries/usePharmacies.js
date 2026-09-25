import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function usePharmacies() {
  return useQuery({
    queryKey: queryKeys.pharmacies,

    queryFn: async () => {
      const pharmacies =
        await api.getPharmacies()

      if (!Array.isArray(pharmacies)) {
        return []
      }

      return pharmacies.filter(
        (pharmacy) =>
          String(
            pharmacy?.status || '',
          ).toUpperCase() === 'ACTIVE',
      )
    },

    /*
     * Pharmacy partner information changes
     * infrequently, so keep it fresh for
     * 10 minutes.
     */
    staleTime: 10 * 60 * 1000,
  })
}