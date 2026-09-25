import { useQuery } from '@tanstack/react-query'

import { apiRequest } from '../../lib/api'
import { queryKeys } from '../../lib/queryKeys'

export function useCustomerProfile(accessToken) {
  return useQuery({
    queryKey: queryKeys.profile,

    queryFn: async () => {
      const response = await apiRequest('/users/me/profile', {
        token: accessToken,
      })

      /*
       * The profile endpoint is expected to return:
       *
       * {
       *   success: true,
       *   data: {
       *     ...
       *   }
       * }
       */
      return response?.data ?? null
    },

    /*
     * Do not request profile information until an
     * authenticated customer access token exists.
     */
    enabled: Boolean(accessToken),

    /*
     * Customer profile information changes infrequently.
     *
     * Keep it fresh for 5 minutes. Profile updates will
     * explicitly invalidate/update this cache later.
     */
    staleTime: 5 * 60 * 1000,
  })
}