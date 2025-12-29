import { useState, useEffect, useRef, useCallback } from 'react';
import { Button } from '@/components/Button';
import { AlertTriangle, RefreshCcw, RotateCw } from 'lucide-react';
import type { UploadedFile, DealConfig } from '@/types/types';
import { BuyerDocumentsTab } from '../components/documents/BuyerDocumentsTab';
import { SellerDocumentsTab } from '../components/documents/SellerDocumentsTab';
import { PropertyDocumentsTab } from '../components/documents/PropertyDocumentsTab';
import { documentChecklistService } from '../services/document-checklist.service';
import type { ConsolidatedChecklist, ChecklistRequestDTO } from '@/types/checklist.types';
import { ChecklistSummary } from '../components/documents/ChecklistSummary';
import { useOcr } from '@/hooks/useOcr';
import { useRemoveDocumentFromDeal } from '../hooks/useDeals';

interface DocumentsStepProps {
	files: UploadedFile[];
	onFilesChange: (files: UploadedFile[] | ((prevFiles: UploadedFile[]) => UploadedFile[])) => void;
	onNext?: () => void;
	onAnalysisComplete?: (data: any) => void;
	config: DealConfig;
	dealId?: string | null;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({
	files,
	onFilesChange,
	config,
	dealId
}) => {
	const removeDocumentFromDealMutation = useRemoveDocumentFromDeal();

	const [activeTab, setActiveTab] = useState<'buyers' | 'sellers' | 'property'>('buyers');
	const [checklist, setChecklist] = useState<ConsolidatedChecklist | null>(null);
	const [isLoadingChecklist, setIsLoadingChecklist] = useState(false);
	const [checklistError, setChecklistError] = useState<string | null>(null);
	const hasCheckedOnMountRef = useRef(false);
	const mountTimestampRef = useRef<number>(Date.now());

	// Integração com OCR
	const {
		stats: ocrStats,
		isProcessing: isOcrProcessing,
		isCheckingStatus,
		manualRefresh,
	} = useOcr(files, onFilesChange, {
		autoProcess: true,
		dealId: dealId || undefined,
		onComplete: (_documentId, extractedData, localFileId) => {
			onFilesChange(prevFiles => prevFiles.map(f => {
				if (f.id === localFileId) {
					return {
						...f,
						validated: true,
						ocrExtractedData: extractedData, // Garantir que extractedData está salvo no arquivo
					};
				}
				return f;
			}));
		},
		onError: (fileId, error) => {
			console.error('❌ Erro no OCR:', fileId, error);
		},
	});

	const handleManualRefresh = useCallback(() => {
		manualRefresh(files);
	}, [manualRefresh, files]);

	// Resetar flag ao montar o componente
	useEffect(() => {
		hasCheckedOnMountRef.current = false;
		mountTimestampRef.current = Date.now();

		return () => {};
	}, []);

	// Verificar status de arquivos em processamento ao montar ou quando arquivos mudarem
	useEffect(() => {
		const processingFiles = files.filter(f =>
			f.ocrStatus === 'processing' ||
			f.ocrStatus === 'uploading'
		);

		if (processingFiles.length > 0 && !isCheckingStatus) {
			// Verificar se já passou tempo suficiente desde a última verificação (evitar spam)
			const timeSinceMount = Date.now() - mountTimestampRef.current;

			if (!hasCheckedOnMountRef.current || timeSinceMount < 2000) {
				console.log(`🔄 DocumentsStep: ${processingFiles.length} arquivo(s) em processamento - verificando status`);
				hasCheckedOnMountRef.current = true;

				const timeoutId = setTimeout(() => {
					handleManualRefresh();
				}, 1000);

				return () => clearTimeout(timeoutId);
			}
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [files.length, isCheckingStatus]); // Usar files.length ao invés de files para evitar loops

	useEffect(() => {
		const loadChecklist = async () => {
			setIsLoadingChecklist(true);
			setChecklistError(null);

			try {
				const checklists = [];

				for (const seller of config.sellers) {
					for (const buyer of config.buyers) {
						const requestData: ChecklistRequestDTO = {
							vendedor: {
								tipo: seller.personType,
								estadoCivil: seller.maritalState,
								regimeBens: seller.propertyRegime
							},
							comprador: {
								tipo: buyer.personType,
								estadoCivil: buyer.maritalState,
								regimeBens: buyer.propertyRegime,
								vaiFinanciar: config.bankFinancing
							},
							imovel: {
								situacao: config.propertyState,
								tipoImovel: config.propertyType
							}
						};

						const response = await documentChecklistService.generateChecklist(requestData);

						if (response && response.sucesso) {
							checklists.push(response.dados);
						}
					}
				}

				if (checklists.length > 0) {
					const consolidated = documentChecklistService.consolidateMultipleChecklists(checklists);
					setChecklist(consolidated);
				} else {
					setChecklistError('Não foi possível gerar o checklist de documentos. Por favor, tente novamente.');
				}
			} catch (error) {
				console.error('Erro ao carregar checklist:', error);
				setChecklistError('Erro ao carregar checklist de documentos');
			} finally {
				setIsLoadingChecklist(false);
			}
		};

		loadChecklist();
	}, [config]);

	const handleRemoveFile = (fileId: string) => {
		if (!dealId) return;

		onFilesChange(files.filter(f => f.id !== fileId));
		removeDocumentFromDealMutation.mutate({ dealId, documentId: fileId }, {
			onSuccess: () => {
				console.log('✅ Documento removido do deal');
			},
			onError: (error) => {
				console.error('❌ Erro ao remover documento do deal:', error);
			}
		});
	}

	if (isLoadingChecklist) {
		return (
			<div className="flex flex-col items-center justify-center h-96 space-y-8 animate-in fade-in">
				<div className="relative">
					<div className="w-16 h-16 border-4 border-slate-200 border-t-primary rounded-full animate-spin"></div>
				</div>
				<div className="text-center space-y-2">
					<h3 className="text-xl font-bold text-slate-800">Gerando Checklist...</h3>
					<p className="text-slate-500">Analisando configuração da negociação</p>
				</div>
			</div>
		);
	}

	if (checklistError) {
		return (
			<div className="flex flex-col items-center justify-center h-96 space-y-8 animate-in fade-in">
				<div className="text-center space-y-4">
					<AlertTriangle className="w-16 h-16 text-red-500 mx-auto" />
					<h3 className="text-xl font-bold text-slate-800">Erro ao Carregar Checklist</h3>
					<p className="text-slate-500">{checklistError}</p>
					<div className="flex justify-center">
						<Button onClick={() => window.location.reload()} className="btn-md">
							<RefreshCcw className="w-5 h-5" />
							Tentar Novamente
						</Button>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6 animate-in fade-in duration-500">
			{/* Checklist Summary */}
			{checklist && (
				<ChecklistSummary
					checklist={checklist}
					uploadedFiles={files}
					numSellers={config.sellers.length}
					numBuyers={config.buyers.length}
				/>
			)}

			{/* Status Panel */}
			{files.length > 0 && (ocrStats.processing > 0 || ocrStats.uploading > 0 || ocrStats.completed > 0) && (
				<div className="bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 border border-indigo-200 rounded-2xl p-6 shadow-lg backdrop-blur-sm">
					<div className="flex items-center justify-between mb-4">
						<div className="flex items-center gap-3">
							<div className="relative">
								<div className="w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-pulse"></div>
								<div className="absolute inset-0 w-4 h-4 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full animate-ping opacity-75"></div>
							</div>
							<h3 className="font-bold text-lg text-slate-800">Status dos Documentos</h3>
						</div>

						{/* Botão de refresh manual */}
						{ocrStats.processing > 0 && (
							<button
								onClick={handleManualRefresh}
								disabled={isCheckingStatus}
								className="cursor-pointer flex items-center gap-2 px-4 py-2 bg-white hover:bg-indigo-50 rounded-xl border border-indigo-300 shadow-sm transition-all hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
								title="Atualizar status"
							>
								<RotateCw className={`w-4 h-4 text-indigo-600 ${isCheckingStatus ? 'animate-spin' : ''}`} />
								<span className="text-sm font-semibold text-indigo-800">
									{isCheckingStatus ? 'Atualizando...' : 'Atualizar'}
								</span>
							</button>
						)}
					</div>

					<div className="grid grid-cols-5 gap-4">
						<div className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-slate-200 shadow-sm">
							<div className="text-3xl font-bold text-slate-800 mb-1">{ocrStats.total}</div>
							<div className="text-xs font-medium text-slate-600 uppercase tracking-wide">Total</div>
						</div>
						<div className="bg-blue-50/80 backdrop-blur-sm rounded-xl p-4 text-center border border-blue-200 shadow-sm">
							<div className="text-3xl font-bold text-blue-700 mb-1">{ocrStats.uploading}</div>
							<div className="text-xs font-medium text-blue-600 uppercase tracking-wide">Enviando</div>
						</div>
						<div className="bg-gradient-to-br from-purple-50 to-indigo-50 backdrop-blur-sm rounded-xl p-4 text-center border border-purple-200 shadow-sm relative overflow-hidden">
							{ocrStats.processing > 0 && (
								<div className="absolute inset-0 bg-gradient-to-r from-purple-400/20 to-indigo-400/20 animate-pulse"></div>
							)}
							<div className="text-3xl font-bold text-purple-700 mb-1 flex items-center justify-center gap-2 relative z-10">
								{ocrStats.processing}
								{ocrStats.processing > 0 && (
									<div className="w-2 h-2 bg-purple-500 rounded-full animate-pulse"></div>
								)}
							</div>
							<div className="text-xs font-medium text-purple-600 uppercase tracking-wide relative z-10">Processando</div>
						</div>
						<div className="bg-green-50/80 backdrop-blur-sm rounded-xl p-4 text-center border border-green-200 shadow-sm">
							<div className="text-3xl font-bold text-green-700 mb-1">{ocrStats.completed}</div>
							<div className="text-xs font-medium text-green-600 uppercase tracking-wide">Concluído</div>
						</div>
						<div className="bg-red-50/80 backdrop-blur-sm rounded-xl p-4 text-center border border-red-200 shadow-sm">
							<div className="text-3xl font-bold text-red-700 mb-1">{ocrStats.error}</div>
							<div className="text-xs font-medium text-red-600 uppercase tracking-wide">Erro</div>
						</div>
					</div>

					{isOcrProcessing && (
						<div className="mt-4 flex items-center gap-3 text-sm text-slate-700 bg-white/60 backdrop-blur-sm rounded-lg px-4 py-2 border border-indigo-200">
							<div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
							<span className="font-medium">Processando seus documentos...</span>
						</div>
					)}
				</div>
			)}

			{/* Tabs Navigation */}
			<div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
				<div className="border-b border-slate-200 bg-slate-50/30">
					<div className="flex">
						<button
							type="button"
							onClick={() => setActiveTab('buyers')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'buyers'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Compradores
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('sellers')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'sellers'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Vendedores
						</button>
						<button
							type="button"
							onClick={() => setActiveTab('property')}
							className={`flex-1 px-6 py-3 font-medium text-sm transition-all ${activeTab === 'property'
								? 'text-primary border-b-2 border-primary bg-white'
								: 'text-slate-500 hover:text-slate-700 hover:bg-slate-50'
								}`}
						>
							Imóvel
						</button>
					</div>
				</div>

				{/* Tab Content */}
				<div className="p-6">
					{activeTab === 'buyers' && (
						<BuyerDocumentsTab
							buyers={config.buyers || []}
							uploadedFiles={files}
							onFilesChange={onFilesChange}
							onRemoveFile={handleRemoveFile}
							checklist={checklist}
						/>
					)}

					{activeTab === 'sellers' && (
						<SellerDocumentsTab
							sellers={config.sellers || []}
							uploadedFiles={files}
							onFilesChange={onFilesChange}
							onRemoveFile={handleRemoveFile}
							checklist={checklist}
						/>
					)}

					{activeTab === 'property' && (
						<PropertyDocumentsTab
							propertyState={config.propertyState}
							propertyType={config.propertyType}
							deedCount={config.deedCount}
							uploadedFiles={files}
							onFilesChange={onFilesChange}
							onRemoveFile={handleRemoveFile}
							checklist={checklist}
						/>
					)}
				</div>
			</div>
		</div>
	);
};
