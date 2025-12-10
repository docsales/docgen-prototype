/**
 * Serviço de integração com LLMWhisperer OCR
 * Documentação: https://docs.unstract.com/llmwhisperer/
 */

import type {
  OcrUploadParams,
  OcrServiceConfig,
  OcrWebhookResponse,
  OcrStatus,
  OcrProcessingState,
  OcrMetadata
} from '@/types/ocr.types';

/**
 * Serviço para gerenciar upload e processamento de documentos via LLMWhisperer
 */
export class OcrService {
  private config: OcrServiceConfig;
  private processingDocuments: Map<string, OcrProcessingState> = new Map();

  constructor(config?: Partial<OcrServiceConfig>) {
    // Configuração padrão - valores podem ser sobrescritos por variáveis de ambiente
    this.config = {
      baseUrl: config?.baseUrl || import.meta.env.VITE_OCR_BASE_URL || '',
      apiKey: config?.apiKey || import.meta.env.VITE_OCR_API_KEY || '',
      defaultWebhookUrl: config?.defaultWebhookUrl || import.meta.env.VITE_OCR_WEBHOOK_URL || '',
      defaultMode: config?.defaultMode || 'high_quality',
      defaultOutputMode: config?.defaultOutputMode || 'text',
    };
  }

  /**
   * Converte arquivo para FormData com os parâmetros necessários
   */
  private prepareFormData(params: OcrUploadParams): FormData {
    const formData = new FormData();
    
    // Adicionar arquivo
    formData.append('file', params.file);
    
    // Adicionar parâmetros como query string ou form fields
    // Nota: LLMWhisperer pode usar query params ou form data, verificar documentação específica
    
    return formData;
  }

  /**
   * Constrói URL com query parameters para o LLMWhisperer
   */
  private buildRequestUrl(params: OcrUploadParams): string {
    const baseUrl = this.config.baseUrl;
    const url = new URL(`${baseUrl}/whisper`);
    
    // Parâmetros básicos
    url.searchParams.set('output_mode', params.outputMode || this.config.defaultOutputMode || 'text');
    url.searchParams.set('mode', params.mode || this.config.defaultMode || 'high_quality');
    
    // Webhook
    const webhookUrl = params.webhookUrl || this.config.defaultWebhookUrl;
    if (webhookUrl) {
      url.searchParams.set('use_webhook', webhookUrl);
    }
    
    // Metadata como JSON string
    if (params.metadata) {
      url.searchParams.set('webhook_metadata', JSON.stringify(params.metadata));
    }
    
    // Tag adicional (pode ser o ID do documento)
    if (params.tag) {
      url.searchParams.set('tag', params.tag);
    }
    
    // Nome do arquivo
    if (params.file.name) {
      url.searchParams.set('file_name', params.file.name);
    }
    
    return url.toString();
  }

  /**
   * Faz upload de um documento para processamento OCR
   * @param params Parâmetros do upload
   * @returns Promise com o hash do processamento ou erro
   */
  async uploadDocument(params: OcrUploadParams): Promise<{
    success: boolean;
    whisperHash?: string;
    error?: string;
  }> {
    try {
      // Validar configuração
      if (!this.config.baseUrl) {
        console.error('❌ URL base do OCR não configurada!');
        console.error('📝 Você precisa criar um arquivo .env na raiz do projeto com:');
        console.error('   VITE_OCR_BASE_URL=https://sua-instancia-llmwhisperer.com');
        console.error('📄 Veja o arquivo .env.template para exemplo completo.');
        throw new Error('URL base do OCR não configurada. Configure VITE_OCR_BASE_URL no arquivo .env');
      }

      // Criar FormData com o arquivo
      const formData = new FormData();
      formData.append('file', params.file);

      // Construir URL com query parameters
      const requestUrl = this.buildRequestUrl(params);

      console.log('📤 Enviando documento para OCR:', {
        url: requestUrl,
        fileName: params.file.name,
        fileSize: params.file.size,
        metadata: params.metadata,
      });

      // Fazer requisição
      const response = await fetch(requestUrl, {
        method: 'POST',
        body: formData,
        headers: {
          // Adicionar API key se configurada
          ...(this.config.apiKey && { 'Authorization': `Bearer ${this.config.apiKey}` }),
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Erro ao enviar documento: ${response.status} - ${errorText}`);
      }

      const result = await response.json();
      
      console.log('✅ Documento enviado com sucesso:', result);

      // Extrair whisper_hash da resposta
      const whisperHash = result.whisper_hash || result.whisperHash || result.id;

      if (!whisperHash) {
        console.warn('⚠️ Resposta não contém whisper_hash:', result);
      }

      return {
        success: true,
        whisperHash,
      };

    } catch (error) {
      console.error('❌ Erro ao fazer upload do documento:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Erro desconhecido',
      };
    }
  }

  /**
   * Registra um documento em processamento
   */
  registerProcessing(documentId: string, state: OcrProcessingState): void {
    this.processingDocuments.set(documentId, {
      ...state,
      uploadedAt: state.uploadedAt || new Date(),
    });
  }

  /**
   * Atualiza o estado de um documento em processamento
   */
  updateProcessingState(documentId: string, updates: Partial<OcrProcessingState>): void {
    const current = this.processingDocuments.get(documentId);
    if (current) {
      this.processingDocuments.set(documentId, {
        ...current,
        ...updates,
      });
    }
  }

  /**
   * Obtém o estado de processamento de um documento
   */
  getProcessingState(documentId: string): OcrProcessingState | undefined {
    return this.processingDocuments.get(documentId);
  }

  /**
   * Remove um documento do registro de processamento
   */
  clearProcessing(documentId: string): void {
    this.processingDocuments.delete(documentId);
  }

  /**
   * Processa o retorno do webhook
   * Deve ser chamado quando o webhook receber a resposta do OCR
   */
  handleWebhookResponse(response: OcrWebhookResponse, documentId: string): void {
    console.log('📨 Webhook recebido para documento:', documentId, response);

    const state = this.processingDocuments.get(documentId);
    if (!state) {
      console.warn('⚠️ Documento não encontrado no registro:', documentId);
      return;
    }

    if (response.status === 'success') {
      this.updateProcessingState(documentId, {
        status: 'completed' as OcrStatus,
        extractedData: response.result_json || { text: response.result_text },
        completedAt: new Date(),
        progress: 100,
      });
    } else {
      this.updateProcessingState(documentId, {
        status: 'error' as OcrStatus,
        error: response.error_message || 'Erro desconhecido no processamento',
        progress: 0,
      });
    }
  }

  /**
   * Cria metadata para um documento baseado em suas características
   */
  createMetadata(
    documentType: string,
    category: 'buyers' | 'sellers' | 'property',
    personId?: string,
    customId?: string
  ): OcrMetadata {
    return {
      type: documentType,
      category,
      personId,
      customId: customId || personId,
    };
  }

  /**
   * Lista todos os documentos em processamento
   */
  getProcessingDocuments(): Map<string, OcrProcessingState> {
    return new Map(this.processingDocuments);
  }

  /**
   * Limpa todos os documentos concluídos ou com erro
   */
  clearCompletedDocuments(): void {
    for (const [id, state] of this.processingDocuments.entries()) {
      if (state.status === 'completed' || state.status === 'error') {
        this.processingDocuments.delete(id);
      }
    }
  }
}

// Exportar instância singleton
export const ocrService = new OcrService();

