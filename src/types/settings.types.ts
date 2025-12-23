export interface UserSettings {
  id: string;
  userId: string;
  docsalesUserEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentTemplate {
  id: string;
  userId: string;
  label: string;
  templateId: string;
  description?: string | null;
  isActive: boolean;
  order: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDocumentTemplateDto {
  label: string;
  templateId: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateDocumentTemplateDto {
  label?: string;
  templateId?: string;
  description?: string;
  isActive?: boolean;
  order?: number;
}

export interface UpdateUserSettingsDto {
  docsalesUserEmail?: string;
}

export interface UpdateUserDto {
  name?: string;
  email?: string;
  docsalesAccountId?: string;
  docsalesApiKey?: string;
  folderId?: string;
}

export interface WebhookToken {
  id: string;
  userId: string;
  token: string;
  lastUsedAt: string | null;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface WebhookEvent {
  id: string;
  userId: string;
  payload: any;
  headers: any;
  processedAt: string | null;
}

