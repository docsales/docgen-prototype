import { useState } from 'react';
import { UserCheck, AlertCircle, X } from 'lucide-react';
import type { Person, UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import { AlertBanner } from './AlertBanner';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';
import { ocrService } from '@/services/ocr.service';

interface SellerDocumentsTabProps {
	sellers: Person[];
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
}

export const SellerDocumentsTab: React.FC<SellerDocumentsTabProps> = ({
	sellers,
	uploadedFiles,
	onFilesChange,
	onRemoveFile,
	checklist
}) => {	
	const sellerFiles = uploadedFiles.filter(f => f.category === 'sellers');
	const [linkingFileId, setLinkingFileId] = useState<string | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);
	
	const requiredDocuments = checklist?.vendedores.documentos || [];
	const alerts = checklist?.vendedores.alertas || [];

	const handleFileUpload = (files: File[], documentType: string, personId?: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: generateFileId(),
			file,
			type: documentType,
			types: [documentType], // Initialize types array
			category: 'sellers',
			personId: personId,
			validated: undefined,
			ocrStatus: 'uploading' as const
		}));

		const updatedFiles = [...uploadedFiles, ...newFiles];
		onFilesChange(updatedFiles);
		
		// A validação agora é automática via OCR quando o processamento completar
	};

	const handleLinkExistingFile = async (fileId: string, documentType: string) => {
		setLinkingFileId(fileId);
		setLinkError(null);

		// Encontrar o arquivo original
		const sourceFile = uploadedFiles.find(f => f.id === fileId);
		if (!sourceFile) {
			console.error('❌ Arquivo original não encontrado:', fileId);
			setLinkError('Arquivo não encontrado. Tente novamente.');
			setLinkingFileId(null);
			return;
		}
		
		if (!sourceFile.documentId) {
			console.error('❌ Arquivo sem documentId:', {
				fileId: sourceFile.id,
				fileName: sourceFile.file.name,
				ocrStatus: sourceFile.ocrStatus,
				validated: sourceFile.validated,
				documentId: sourceFile.documentId
			});
			setLinkError('O documento ainda não foi salvo no banco de dados. Aguarde o processamento.');
			setLinkingFileId(null);
			return;
		}

		try {
			// Chamar API para criar novo documento no banco
			const result = await ocrService.linkDocumentType(sourceFile.documentId, documentType);

			if (!result.success) {
				console.error('❌ Erro ao vincular documento:', result.error);
				setLinkError(`Erro ao vincular documento: ${result.error}`);
				setLinkingFileId(null);
				return;
			}

			// Criar novo UploadedFile que compartilha dados do original
			const newFile: UploadedFile = {
				...sourceFile,
				id: generateFileId(), // Novo ID local
				documentId: result.documentId, // Novo ID do banco
				type: documentType,
				types: [documentType],
			};

			// Adicionar ao array de arquivos
			onFilesChange([...uploadedFiles, newFile]);
			console.log(`✓ Documento vinculado a ${documentType} (novo ID: ${result.documentId})`);

		} catch (error) {
			console.error('❌ Erro ao vincular documento:', error);
			setLinkError('Erro ao vincular documento. Tente novamente.');
		} finally {
			setLinkingFileId(null);
		}
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-3 mb-6">
				<UserCheck className="w-6 h-6 text-primary" />
				<h3 className="text-xl font-bold text-slate-800">Documentos dos Vendedores</h3>
			</div>

			{/* Erro de vinculação */}
			{linkError && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3 animate-in fade-in">
					<AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
					<div className="flex-1">
						<p className="text-sm text-red-800">{linkError}</p>
					</div>
					<button
						onClick={() => setLinkError(null)}
						className="cursor-pointer text-red-400 hover:text-red-600 transition-colors"
					>
						<X className="w-4 h-4" />
					</button>
				</div>
			)}

			{/* Alertas */}
			{alerts.length > 0 && (
				<AlertBanner alerts={alerts} />
			)}

			{/* Agrupar documentos por vendedor */}
			{sellers.map((seller, index) => {
				// Filtrar documentos deste vendedor específico
				const sellerSpecificFiles = sellerFiles.filter(f => f.personId === seller.id);
				
				// Determinar se é cônjuge para filtrar documentos corretos
				const isSpouse = seller.isSpouse || false;
				const expectedDe = isSpouse ? 'conjuge' : 'titular';
				
				// Filtrar documentos que pertencem a este tipo de pessoa (titular ou cônjuge)
				// Se não tiver o campo 'de', incluir (documentos genéricos)
				const sellerDocuments = requiredDocuments.filter(doc => 
					!doc.de || doc.de === expectedDe
				);
				
				// Contar documentos validados deste vendedor
				const validatedCount = sellerDocuments.filter(doc => {
					const relatedFiles = sellerSpecificFiles.filter(f => f.type === doc.id);
					return relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
				}).length;

				return (
					<div key={seller.id} className="space-y-4 border-b-2 border-slate-100 last:border-b-0">
						{/* Header do vendedor */}
						<div className="bg-gradient-to-r from-blue-50 to-blue-100 px-4 py-3 rounded-lg border border-blue-200 shadow-sm">
							<div className="flex items-center justify-between">
								<div>
									<h4 className="font-bold text-blue-900 text-lg">
										Vendedor {index + 1}
									</h4>
									<p className="text-sm text-blue-700 mt-1">
										{seller.personType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
										{seller.maritalState && ` • ${seller.maritalState.replace('_', ' ')}`}
									</p>
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-blue-900">
										{validatedCount}/{sellerDocuments.length}
									</div>
									<div className="text-xs text-blue-700">documentos</div>
								</div>
							</div>
						</div>

						{/* Documentos obrigatórios deste vendedor */}
						<div className="space-y-3 pl-2">
							{sellerDocuments.length > 0 ? (
								sellerDocuments.map((doc) => (
									<DocumentRequirementItem
										key={`${doc.id}_${doc.de || 'generic'}_${seller.id}`}
										documentId={doc.id}
										documentName={doc.nome}
										description={doc.observacao}
										uploadedFiles={sellerSpecificFiles}
										allFiles={sellerFiles}
										onFileUpload={handleFileUpload}
										onRemoveFile={onRemoveFile}
										onLinkExistingFile={handleLinkExistingFile}
										personId={seller.id}
										linkingFileId={linkingFileId}
									/>
								))
							) : (
								<div className="text-center py-12 text-slate-500">
									<span className="loading loading-spinner loading-lg w-12 h-12 text-[#ef0474] mx-auto mb-4"></span>
									<p className="text-sm text-slate-500">Carregando documentos necessários...</p>
								</div>
							)}
						</div>
					</div>
				);
			})}

			{sellers.length === 0 && (
				<div className="text-center py-8 text-slate-500">
					<p>Nenhum vendedor configurado</p>
				</div>
			)}
		</div>
	);
};
