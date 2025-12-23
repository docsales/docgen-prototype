import { useInfiniteQuery } from '@tanstack/react-query';
import { webhooksService } from '../../../services/webhooks.service';

export const webhookKeys = {
  all: ['webhooks'] as const,
  tokens: () => [...webhookKeys.all, 'tokens'] as const,
  events: () => [...webhookKeys.all, 'events'] as const,
  eventsPaginated: () => [...webhookKeys.events(), 'paginated'] as const,
};

/**
 * Hook para infinite scroll com paginação de webhook events
 */
export function useWebhookEventsInfinite(limit: number = 20) {
  return useInfiniteQuery({
    queryKey: [...webhookKeys.eventsPaginated(), limit],
    queryFn: ({ pageParam = 0 }) => 
      webhooksService.getEventsPaginated(pageParam, limit),
    getNextPageParam: (lastPage) => lastPage.next,
    initialPageParam: 0,
    enabled: true,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
  });
}

