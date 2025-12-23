import { server } from './api.service';
import type { WebhookToken, WebhookEvent } from '../types/settings.types';
import type { PaginatedResponse } from '../types/types';

export class WebhooksService {
  async generateToken(): Promise<WebhookToken> {
    const response = await server.api.post<WebhookToken>(`/webhooks/tokens`, {}, { withCredentials: true });
    return response.data;
  }

  async getTokens(): Promise<WebhookToken[]> {
    const response = await server.api.get<WebhookToken[]>(`/webhooks/tokens`, { withCredentials: true });
    return response.data;
  }

  async getEventsPaginated(page: number, limit: number): Promise<PaginatedResponse<WebhookEvent>> {
    const response = await server.api.get<PaginatedResponse<WebhookEvent>>(
      `/webhooks/events/paginated?page=${page}&limit=${limit}`,
      { withCredentials: true }
    );
    return response.data;
  }
}

export const webhooksService = new WebhooksService();

