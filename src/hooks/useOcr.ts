/**
 * Hook para gerenciar integração com OCR nos documentos
 */

import { useCallback, useEffect, useState } from 'react';
import { ocrService } from '@/services/ocr.service';
import type { UploadedFile } from '@/types/types';
import { OcrStatus } from '@/types/ocr.types';

interface UseOcrOptions {
  autoProcess?: boolean; // Processar automaticamente quando arquivo for adicionado
  onComplete?: (fileId: string, extractedData: any) => void;
  onError?: (fileId: string, error: string) => void;
}

export const useOcr = (
  files: UploadedFile[],
  onFilesChange: (files: UploadedFile[]) => void,
  options: UseOcrOptions = {}
) => {
  const { autoProcess = true, onComplete, onError } = options;
  const [isProcessing, setIsProcessing] = useState(false);

  /**
   * Processa um arquivo específico via OCR
   */
  const processFile = useCallback(async (file: UploadedFile) => {
    try {
      console.log('🚀 Iniciando processamento OCR:', file.file.name);

      // Atualizar status para uploading
      updateFileOcrStatus(file.id, OcrStatus.UPLOADING, 10);

      // Criar metadata
      const metadata = ocrService.createMetadata(
        file.type,
        file.category,
        file.personId,
        file.personId || `${file.category}-${file.type}`
      );

      // Fazer upload
      const result = await ocrService.uploadDocument({
        file: file.file,
        metadata,
        tag: file.id,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

      console.log('✅ Upload concluído, whisperHash:', result.whisperHash);

      // Atualizar status para processing
      updateFileOcrStatus(file.id, OcrStatus.PROCESSING, 50, result.whisperHash);

      // Registrar no serviço
      ocrService.registerProcessing(file.id, {
        status: OcrStatus.PROCESSING,
        whisperHash: result.whisperHash,
        uploadedAt: new Date(),
        progress: 50,
      });

      // Simular progresso enquanto aguarda webhook
      // (Em produção, o webhook atualizará o status)
      simulateProgress(file.id);

    } catch (error) {
      console.error('❌ Erro no processamento OCR:', error);
      const errorMessage = error instanceof Error ? error.message : 'Erro desconhecido';
      updateFileOcrStatus(file.id, OcrStatus.ERROR, 0, undefined, errorMessage);
      
      if (onError) {
        onError(file.id, errorMessage);
      }
    }
  }, [onError]);

  /**
   * Simula progresso enquanto aguarda webhook
   * Em produção, o webhook real atualizará o status
   */
  const simulateProgress = (fileId: string) => {
    let progress = 50;
    const interval = setInterval(() => {
      progress += 5;
      if (progress >= 90) {
        clearInterval(interval);
        // Parar em 90% aguardando o webhook real
      } else {
        const file = files.find(f => f.id === fileId);
        if (file && file.ocrStatus === OcrStatus.PROCESSING) {
          updateFileOcrStatus(fileId, OcrStatus.PROCESSING, progress);
        } else {
          clearInterval(interval);
        }
      }
    }, 500);
  };

  /**
   * Atualiza o status OCR de um arquivo
   */
  const updateFileOcrStatus = useCallback((
    fileId: string,
    status: OcrStatus,
    progress?: number,
    whisperHash?: string,
    error?: string,
    extractedData?: any
  ) => {
    onFilesChange(files.map(f => {
      if (f.id === fileId) {
        return {
          ...f,
          ocrStatus: status,
          ocrWhisperHash: whisperHash || f.ocrWhisperHash,
          ocrError: error,
          ocrExtractedData: extractedData || f.ocrExtractedData,
        };
      }
      return f;
    }));

    // Atualizar no serviço também
    ocrService.updateProcessingState(fileId, {
      status,
      progress,
      whisperHash,
      error,
      extractedData,
    });
  }, [files, onFilesChange]);

  /**
   * Processa múltiplos arquivos
   */
  const processMultipleFiles = useCallback(async (filesToProcess: UploadedFile[]) => {
    setIsProcessing(true);
    
    try {
      for (const file of filesToProcess) {
        // Processar apenas se ainda não foi processado
        if (!file.ocrStatus || file.ocrStatus === OcrStatus.IDLE || file.ocrStatus === OcrStatus.ERROR) {
          await processFile(file);
        }
      }
    } finally {
      setIsProcessing(false);
    }
  }, [processFile]);

  /**
   * Processa todos os arquivos pendentes
   */
  const processAllPending = useCallback(async () => {
    const pendingFiles = files.filter(
      f => !f.ocrStatus || f.ocrStatus === OcrStatus.IDLE || f.ocrStatus === OcrStatus.ERROR
    );
    
    if (pendingFiles.length > 0) {
      await processMultipleFiles(pendingFiles);
    }
  }, [files, processMultipleFiles]);

  /**
   * Reprocessa um arquivo com erro
   */
  const retryFile = useCallback(async (fileId: string) => {
    const file = files.find(f => f.id === fileId);
    if (file) {
      await processFile(file);
    }
  }, [files, processFile]);

  /**
   * Simula recebimento de webhook (para testes)
   * Em produção, isso seria chamado pelo endpoint que recebe o webhook
   */
  const simulateWebhookResponse = useCallback((fileId: string, success: boolean = true) => {
    if (success) {
      // Simular dados extraídos
      const mockExtractedData = {
        text: 'Dados extraídos do documento via OCR',
        confidence: 0.95,
        fields: {
          nome: 'João da Silva',
          cpf: '123.456.789-00',
          rg: '12.345.678-9',
        },
      };

      updateFileOcrStatus(
        fileId,
        OcrStatus.COMPLETED,
        100,
        undefined,
        undefined,
        mockExtractedData
      );

      if (onComplete) {
        onComplete(fileId, mockExtractedData);
      }
    } else {
      updateFileOcrStatus(
        fileId,
        OcrStatus.ERROR,
        0,
        undefined,
        'Erro ao processar documento no OCR'
      );
    }
  }, [updateFileOcrStatus, onComplete]);

  /**
   * Auto-processar novos arquivos
   */
  useEffect(() => {
    if (!autoProcess) return;

    // Verificar se OCR está habilitado
    const ocrDisabled = import.meta.env.VITE_OCR_DISABLED === 'true';
    const ocrBaseUrl = import.meta.env.VITE_OCR_BASE_URL;
    
    if (ocrDisabled) {
      console.log('⚠️ OCR está desabilitado via variável de ambiente');
      return;
    }

    if (!ocrBaseUrl) {
      console.warn('⚠️ VITE_OCR_BASE_URL não configurada. OCR não será processado.');
      console.warn('📝 Crie um arquivo .env com as configurações necessárias.');
      console.warn('📄 Veja .env.template para exemplo.');
      return;
    }

    const newFiles = files.filter(
      f => !f.ocrStatus || f.ocrStatus === OcrStatus.IDLE
    );

    if (newFiles.length > 0 && !isProcessing) {
      processMultipleFiles(newFiles);
    }
  }, [files, autoProcess, isProcessing, processMultipleFiles]);

  // Estatísticas
  const stats = {
    total: files.length,
    idle: files.filter(f => f.ocrStatus === OcrStatus.IDLE || !f.ocrStatus).length,
    uploading: files.filter(f => f.ocrStatus === OcrStatus.UPLOADING).length,
    processing: files.filter(f => f.ocrStatus === OcrStatus.PROCESSING).length,
    completed: files.filter(f => f.ocrStatus === OcrStatus.COMPLETED).length,
    error: files.filter(f => f.ocrStatus === OcrStatus.ERROR).length,
  };

  return {
    processFile,
    processMultipleFiles,
    processAllPending,
    retryFile,
    updateFileOcrStatus,
    simulateWebhookResponse, // Para testes
    isProcessing,
    stats,
  };
};

