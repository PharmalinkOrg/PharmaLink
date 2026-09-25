import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function useMedicineCategories() {
  return useQuery({
    queryKey: queryKeys.medicineCategories,

    queryFn: async () => {
      const categories =
        await api.getMedicineCategories()

      return Array.isArray(categories)
        ? categories
        : []
    },

    /*
     * Categories rarely change during a customer session.
     */
    staleTime: 10 * 60 * 1000,
  })
}