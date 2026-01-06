import { useState } from 'react';
import { Users, AlertCircle, X } from 'lucide-react';
import type { Person, UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import { AlertBanner } from './AlertBanner';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';
import { ocrService } from '@/services/ocr.service';

interface BuyerDocumentsTabProps {
	buyers: Person[];
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
}

export const BuyerDocumentsTab: React.FC<BuyerDocumentsTabProps> = ({
	buyers,
	uploadedFiles,
	onFilesChange,
	onRemoveFile,
	checklist
}) => {
	const buyerFiles = uploadedFiles.filter(f => f.category === 'buyers');
	const [linkingFileId, setLinkingFileId] = useState<string | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);

	// Obter documentos da API ou fallback para array vazio
	const requiredDocuments = checklist?.compradores.documentos || [];
	const alerts = checklist?.compradores.alertas || [];

	const handleFileUpload = (files: File[], documentType: string, personId?: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: generateFileId(),
			file,
			type: documentType,
			types: [documentType], // Initialize types array
			category: 'buyers',
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
				<Users className="w-6 h-6 text-primary" />
				<h3 className="text-xl font-bold text-slate-800">Documentos dos Compradores</h3>
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

			{/* Agrupar documentos por comprador */}
			{buyers.map((buyer, index) => {
				const buyerSpecificFiles = buyerFiles.filter(f => f.personId === buyer.id);

				const isSpouse = buyer.isSpouse || false;
				const expectedDe = isSpouse ? 'conjuge' : 'titular';

				const buyerDocuments = requiredDocuments.filter(doc =>
					!doc.de || doc.de === expectedDe
				);

				// Contar documentos validados deste comprador
				const validatedCount = buyerDocuments.filter(doc => {
					const relatedFiles = buyerSpecificFiles.filter(f => f.type === doc.id);
					return relatedFiles.length > 0 && relatedFiles.every(f => f.validated === true);
				}).length;

				return (
					<div key={buyer.id} className="space-y-4 border-b-2 border-slate-100 last:border-b-0">
						{/* Header do comprador */}
						<div className="bg-gradient-to-r from-green-50 to-green-100 px-4 py-3 rounded-lg border border-green-200 shadow-sm">
							<div className="flex items-center justify-between">
								<div>
									<h4 className="font-bold text-green-900 text-lg">
										Comprador {index + 1}
									</h4>
									<p className="text-sm text-green-700 mt-1">
										{buyer.personType === 'PF' ? 'Pessoa Física' : 'Pessoa Jurídica'}
										{buyer.maritalState && ` • ${buyer.maritalState.replace('_', ' ')}`}
									</p>
								</div>
								<div className="text-right">
									<div className="text-2xl font-bold text-green-900">
										{validatedCount}/{buyerDocuments.length}
									</div>
									<div className="text-xs text-green-700">documentos</div>
								</div>
							</div>
						</div>

						{/* Documentos obrigatórios deste comprador */}
						<div className="space-y-3 pl-2">
							{buyerDocuments.length > 0 ? (
								buyerDocuments.map((doc) => (
									<DocumentRequirementItem
										key={`${doc.id}_${doc.de || 'generic'}_${buyer.id}`}
										documentId={doc.id}
										documentName={doc.nome}
										description={doc.observacao}
										uploadedFiles={buyerSpecificFiles}
										allFiles={buyerFiles}
										onFileUpload={handleFileUpload}
										onRemoveFile={onRemoveFile}
										onLinkExistingFile={handleLinkExistingFile}
										personId={buyer.id}
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

			{buyers.length === 0 && (
				<div className="text-center py-8 text-slate-500">
					<p>Nenhum comprador configurado</p>
				</div>
			)}
		</div>
	);
};
