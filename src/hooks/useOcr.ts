/**
 * Hook para gerenciar upload e status de documentos OCR
 */

import { useCallback, useEffect, useState, useRef } from 'react';
import { ocrService } from '@/services/ocr.service';
import type { UploadedFile } from '@/types/types';
import { OcrStatus } from '@/types/ocr.types';
import { Socket } from 'socket.io-client';

interface UseOcrOptions {
  autoProcess?: boolean;
  dealId?: string;
  onComplete?: (documentId: string, extractedData: any, localFileId: string) => void;
  onError?: (fileId: string, error: string) => void;
}

export const useOcr = (
  files: UploadedFile[],
  onFilesChange: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void,
  options: UseOcrOptions = {}
) => {
  const {
    autoProcess = true,
    dealId,
    onComplete,
    onError
  } = options;

  const [isProcessing, setIsProcessing] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(false);
  const processingRef = useRef<Set<string>>(new Set());
  const processedFilesRef = useRef<Set<string>>(new Set());
  const socketRef = useRef<Socket | null>(null);
  const manualRefreshTimerRef = useRef<number | null>(null);

  /**
   * Atualiza status OCR de um arquivo
   */
  const updateFileOcrStatus = useCallback((
    fileId: string,
    status: OcrStatus,
    whisperHash?: string,
    error?: string,
    extractedData?: any
  ) => {
    onFilesChange((prevFiles: any[]) => prevFiles.map(f => {
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
  }, [onFilesChange]);

  /**
   * Mapeamento de IDs locais para IDs do backend (documentId)
   */
  const fileIdMapRef = useRef<Map<string, string>>(new Map());

  /**
   * Verifica status de um arquivo específico (para checagem manual)
   */
  const checkFileStatus = useCallback(async (documentId: string): Promise<{ status: string; hasUpdate: boolean }> => {
    const requestKey = `checkStatus_${documentId}`;
    if (processingRef.current.has(requestKey)) {
      return { status: 'processing', hasUpdate: false };
    }

    processingRef.current.add(requestKey);

    try {
      const result = await ocrService.getStatus(documentId);

      let localFileId = documentId;
      for (const [localId, mappedDocId] of fileIdMapRef.current.entries()) {
        if (mappedDocId === documentId) {
          localFileId = localId;
          break;
        }
      }

      if (result.status === 'completed') {
        updateFileOcrStatus(localFileId, OcrStatus.COMPLETED, undefined, undefined, result.extractedData);
        onComplete?.(documentId, result.extractedData, localFileId);
        return { status: 'completed', hasUpdate: true };
      } else if (result.status === 'error') {
        updateFileOcrStatus(localFileId, OcrStatus.ERROR, undefined, result.error);
        onError?.(localFileId, result.error || 'Erro no processamento');
        console.log('❌ Erro no arquivo:', localFileId);
        return { status: 'error', hasUpdate: true };
      } else {
        const currentFile = files.find(f => f.id === localFileId);
        if (result.whisperHash && result.whisperHash !== currentFile?.ocrWhisperHash) {
          updateFileOcrStatus(localFileId, OcrStatus.PROCESSING, result.whisperHash);
        }
        return { status: result.status, hasUpdate: false };
      }
    } catch (error) {
      console.error('❌ Erro ao verificar status:', documentId, error);
      return { status: 'error', hasUpdate: false };
    } finally {
      processingRef.current.delete(requestKey);
    }
  }, [updateFileOcrStatus, onComplete, onError, files]);

  const checkFileStatusFast = useCallback(async (documentId: string): Promise<void> => {
    try {
      // Timeout curto e silencioso: serve só como fallback quando WS não está conectado.
      const result = await ocrService.getStatus(documentId, { timeoutMs: 5000, silentTimeout: true });
      if (result.status === 'completed' || result.status === 'error') {
        await checkFileStatus(documentId);
      }
    } catch {
      // noop
    }
  }, [checkFileStatus]);

  /**
   * Processa um arquivo via OCR
   */
  const processFile = useCallback(async (file: UploadedFile) => {
    if (processingRef.current.has(file.id)) return;

    const fileStatus = files.find(f => f.id === file.id)?.ocrStatus;
    const shouldBlock = processedFilesRef.current.has(file.id) &&
      fileStatus !== OcrStatus.ERROR &&
      fileStatus !== OcrStatus.IDLE &&
      fileStatus !== OcrStatus.UPLOADING;

    if (shouldBlock) return;

    processingRef.current.add(file.id);
    processedFilesRef.current.add(file.id);

    try {
      // Só atualiza para UPLOADING se ainda não estiver nesse status
      if (fileStatus !== OcrStatus.UPLOADING) {
        updateFileOcrStatus(file.id, OcrStatus.UPLOADING);
      }

      const metadata = ocrService.createMetadata(
        file.type,
        file.category,
        file.personId,
        file.id,
        dealId
      );

      const result = await ocrService.uploadDocument({
        file: file.file,
        metadata,
      });

      if (!result.success) {
        throw new Error(result.error || 'Erro ao fazer upload');
      }

      const documentId = result.documentId || result.fileId;

      if (documentId && documentId !== file.id) {
        fileIdMapRef.current.set(file.id, documentId);

        processedFilesRef.current.add(documentId);

        onFilesChange((prevFiles: any[]) => prevFiles.map(f => {
          if (f.id === file.id) {
            return { ...f, documentId };
          }
          return f;
        }));
      }

      updateFileOcrStatus(file.id, OcrStatus.PROCESSING, result.whisperHash);

    } catch (error) {
      console.error('❌ Erro no OCR:', error);
      const errorMsg = error instanceof Error ? error.message : 'Erro desconhecido';
      updateFileOcrStatus(file.id, OcrStatus.ERROR, undefined, errorMsg);
      processedFilesRef.current.delete(file.id);
      onError?.(file.id, errorMsg);
    } finally {
      processingRef.current.delete(file.id);
    }
  }, [updateFileOcrStatus, onError, files]);

  /**
   * Processa múltiplos arquivos
   */
  const processMultipleFiles = useCallback(async (filesToProcess: UploadedFile[]) => {
    setIsProcessing(true);

    try {
      const chunks = [];
      for (let i = 0; i < filesToProcess.length; i += 3) {
        chunks.push(filesToProcess.slice(i, i + 3));
      }

      for (const chunk of chunks) {
        await Promise.all(chunk.map(f => processFile(f)));
      }
    } finally {
      setIsProcessing(false);
    }
  }, [processFile]);

  /**
   * Reprocessa um arquivo com erro
   */
  const retryFile = useCallback(async (fileId: string, currentFiles: UploadedFile[]) => {
    const file = currentFiles.find(f => f.id === fileId);
    if (file) {
      processedFilesRef.current.delete(fileId);
      updateFileOcrStatus(fileId, OcrStatus.IDLE);
      await processFile(file);
    }
  }, [processFile, updateFileOcrStatus]);

  /**
   * Auto-processar novos arquivos
   */
  useEffect(() => {
    if (!autoProcess) return;

    const newFiles = files.filter(f => {
      const currentlyProcessing = processingRef.current.has(f.id);
      
      // Processar arquivos sem status, com status IDLE, ou com status UPLOADING que ainda não foram processados
      const hasStatus = f.ocrStatus && f.ocrStatus !== OcrStatus.IDLE;
      const isUploading = f.ocrStatus === OcrStatus.UPLOADING;
      const wasProcessed = processedFilesRef.current.has(f.id);
      
      // Se já está processando, não processar novamente
      if (currentlyProcessing) {
        return false;
      }
      
      // Se tem status UPLOADING mas ainda não foi processado, processar
      if (isUploading && !wasProcessed) {
        return true;
      }
      
      // Se não tem status ou tem status IDLE, processar
      if (!hasStatus) {
        return true;
      }
      
      // Se já foi processado, só reprocessar se tiver erro ou estiver idle
      if (wasProcessed) {
        return f.ocrStatus === OcrStatus.ERROR || f.ocrStatus === OcrStatus.IDLE;
      }

      return false;
    });

    if (newFiles.length > 0) {
      console.log(`📋 Detectados ${newFiles.length} novo(s) arquivo(s) para processar`);
      processMultipleFiles(newFiles);
    }
  }, [files, autoProcess, processMultipleFiles]);

  /**
   * Refresh manual - força processamento em batch de todos os arquivos em processamento
   */
  const manualRefresh = useCallback((currentFiles: UploadedFile[]) => {
    const processingFiles = currentFiles.filter(f => f.ocrStatus === OcrStatus.PROCESSING || f.ocrStatus === OcrStatus.UPLOADING);

    if (processingFiles.length === 0) return;

    if (manualRefreshTimerRef.current) {
      window.clearTimeout(manualRefreshTimerRef.current);
      manualRefreshTimerRef.current = null;
    }

    setIsCheckingStatus(true);

    try {
      const documentIds = processingFiles.map(f => {
        if (f.documentId) return f.documentId;
        const mappedId = fileIdMapRef.current.get(f.id);
        if (mappedId) return mappedId;
        return f.id;
      });

      // Fire-and-forget: não aguarda resposta HTTP (evita timeout); WS atualizará status/resultados.
      void ocrService.processBatchFireAndForget(documentIds);

      // Fallback leve: se WS estiver desconectado, agenda checagem rápida em background.
      const wsConnected = !!socketRef.current?.connected;
      if (!wsConnected) {
        window.setTimeout(() => {
          void Promise.allSettled(documentIds.map(id => checkFileStatusFast(id)));
        }, 1000);
      }
    } catch (error) {
      console.error('❌ Erro no refresh manual:', error);
    } finally {
      // Feedback rápido no botão, sem bloquear.
      manualRefreshTimerRef.current = window.setTimeout(() => {
        setIsCheckingStatus(false);
        manualRefreshTimerRef.current = null;
      }, 800);
    }
  }, [checkFileStatusFast]);

  /**
   * Conectar WebSocket e escutar eventos de OCR
   */
  useEffect(() => {
    let socket: Socket | null = null;
    let isMounted = true;

    const connectWebSocket = async () => {
      if (files.length === 0) return;

      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }

      socket = await ocrService.connectWebSocket();

      if (!socket || !isMounted) {
        if (socket) socket.disconnect();
        return;
      }

      socketRef.current = socket;

      socket.on('ocr_completed', (data: { documentId: string; extractedData: any; status: string }) => {
        if (!isMounted) return;

        let localFileId = data.documentId;
        for (const [localId, mappedDocId] of fileIdMapRef.current.entries()) {
          if (mappedDocId === data.documentId) {
            localFileId = localId;
            break;
          }
        }

        updateFileOcrStatus(localFileId, OcrStatus.COMPLETED, undefined, undefined, data.extractedData);
        onComplete?.(data.documentId, data.extractedData, localFileId);
      });

      socket.on('ocr_error', (data: { documentId: string; error: string }) => {
        if (!isMounted) return;

        let localFileId = data.documentId;
        for (const [localId, mappedDocId] of fileIdMapRef.current.entries()) {
          if (mappedDocId === data.documentId) {
            localFileId = localId;
            break;
          }
        }

        updateFileOcrStatus(localFileId, OcrStatus.ERROR, undefined, data.error);
        onError?.(localFileId, data.error);
      });

      const processingFiles = files.filter(f =>
        f.ocrStatus === OcrStatus.PROCESSING ||
        f.ocrStatus === OcrStatus.UPLOADING
      );

      if (processingFiles.length > 0) {
        setTimeout(() => {
          if (isMounted) {
            processingFiles.forEach(file => {
              const documentId = fileIdMapRef.current.get(file.id) || file.id;
              checkFileStatus(documentId).catch(err => {
                console.error('❌ Erro ao verificar status após reconexão:', err);
              });
            });
          }
        }, 1000);
      }
    };

    connectWebSocket();

    return () => {
      isMounted = false;
      if (manualRefreshTimerRef.current) {
        window.clearTimeout(manualRefreshTimerRef.current);
        manualRefreshTimerRef.current = null;
      }
      if (socket) {
        console.log('🧹 Desconectando WebSocket');
        socket.disconnect();
        socketRef.current = null;
      }
    };
  }, [files.length]);

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
    retryFile,
    updateFileOcrStatus,
    manualRefresh,
    isProcessing,
    isCheckingStatus,
    stats,
  };
};
