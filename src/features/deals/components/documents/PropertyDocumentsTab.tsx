import { useState } from 'react';
import { Home, AlertCircle, X } from 'lucide-react';
import type { PropertyState, PropertyType, UploadedFile } from '@/types/types';
import { DocumentRequirementItem } from './DocumentRequirementItem';
import { AlertBanner } from './AlertBanner';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import { generateFileId } from '@/utils/generateFileId';
import { ocrService } from '@/services/ocr.service';

interface PropertyDocumentsTabProps {
	propertyState: PropertyState;
	propertyType: PropertyType;
	deedCount: number;
	uploadedFiles: UploadedFile[];
	onFilesChange: (files: UploadedFile[]) => void;
	onRemoveFile: (fileId: string) => void;
	checklist: ConsolidatedChecklist | null;
}

export const PropertyDocumentsTab: React.FC<PropertyDocumentsTabProps> = ({
	propertyState,
	propertyType,
	deedCount,
	uploadedFiles,
	onFilesChange,
	onRemoveFile,
	checklist
}) => {
	const propertyFiles = uploadedFiles.filter(f => f.category === 'property');
	const [linkingFileId, setLinkingFileId] = useState<string | null>(null);
	const [linkError, setLinkError] = useState<string | null>(null);
	
	// Obter documentos da API ou fallback para array vazio
	const requiredDocuments = checklist?.imovel.documentos || [];
	const alerts = checklist?.imovel.alertas || [];

	const handleFileUpload = (files: File[], documentType: string) => {
		const newFiles: UploadedFile[] = files.map(file => ({
			id: generateFileId(),
			file,
			type: documentType,
			types: [documentType], // Initialize types array
			category: 'property',
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
				<Home className="w-6 h-6 text-primary" />
				<h3 className="text-xl font-bold text-slate-800">Documentos do Imóvel</h3>
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

			{/* Informações do imóvel */}
			<div className="bg-gradient-to-r from-purple-50 to-purple-100 px-4 py-3 rounded-lg border border-purple-200">
				<h4 className="font-bold text-purple-900">Informações do Imóvel</h4>
				<div className="text-sm text-purple-700 mt-1 flex flex-wrap gap-x-4 gap-y-1">
					<span>Tipo: {propertyType === 'urbano' ? 'Urbano' : 'Rural'}</span>
					<span>•</span>
					<span>Situação: {propertyState.replace('_', ' ')}</span>
					{deedCount > 1 && (
						<>
							<span>•</span>
							<span>{deedCount} matrículas</span>
						</>
					)}
				</div>
			</div>

			{/* Lista de documentos obrigatórios */}
			<div className="space-y-3">
				{requiredDocuments.length > 0 ? (
					requiredDocuments.map((doc) => (
						<DocumentRequirementItem
							key={doc.id}
							documentId={doc.id}
							documentName={doc.nome}
							description={doc.observacao}
							uploadedFiles={propertyFiles}
							allFiles={propertyFiles}
							onFileUpload={handleFileUpload}
							onRemoveFile={onRemoveFile}
							onLinkExistingFile={handleLinkExistingFile}
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
};
