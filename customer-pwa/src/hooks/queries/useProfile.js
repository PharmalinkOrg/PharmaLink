import { useQuery } from '@tanstack/react-query'

import { api } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function useProfile({
  enabled = true,
} = {}) {
  return useQuery({
    queryKey:
      queryKeys.profile,

    queryFn: async () => {
      const profile =
        await api.getMyProfile()

      return profile || null
    },

    enabled,

    staleTime:
      5 * 60 * 1000,
  })
}