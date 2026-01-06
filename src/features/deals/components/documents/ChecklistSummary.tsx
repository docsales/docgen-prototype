import React from 'react';
import { FileText, Calendar, TrendingUp, CheckCircle2 } from 'lucide-react';
import type { ConsolidatedChecklist } from '@/types/checklist.types';
import type { DealConfig, UploadedFile } from '@/types/types';

interface ChecklistSummaryProps {
  checklist: ConsolidatedChecklist;
  uploadedFiles: UploadedFile[];
  config: DealConfig;
}

export const ChecklistSummary: React.FC<ChecklistSummaryProps> = ({ 
  checklist, 
  uploadedFiles,
  config
}) => {
  const fileSatisfiesType = (file: UploadedFile, documentType: string): boolean => {
    if (file.type === documentType) return true;
    if (file.types && file.types.includes(documentType)) return true;
    return false;
  };

  const deedCountClamped = Math.min(Math.max(config.deedCount || 1, 1), 5);

  // Total necessário e total validado usando a MESMA regra dos blocos (titular x cônjuge + matrícula x deedCount)
  let totalRequired = 0;
  let validatedRequired = 0;

  // Vendedores
  const sellerRequiredDocs = checklist.vendedores.documentos.filter(d => d.obrigatorio);
  config.sellers.forEach((seller) => {
    const isSpouse = seller.isSpouse || false;
    const expectedDe = isSpouse ? 'conjuge' : 'titular';
    const docsForThisSeller = sellerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
    const sellerFiles = uploadedFiles.filter(f => f.category === 'sellers' && f.personId === seller.id);

    totalRequired += docsForThisSeller.length;
    validatedRequired += docsForThisSeller.filter(doc =>
      sellerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });

  // Compradores
  const buyerRequiredDocs = checklist.compradores.documentos.filter(d => d.obrigatorio);
  config.buyers.forEach((buyer) => {
    const isSpouse = buyer.isSpouse || false;
    const expectedDe = isSpouse ? 'conjuge' : 'titular';
    const docsForThisBuyer = buyerRequiredDocs.filter(doc => !doc.de || doc.de === expectedDe);
    const buyerFiles = uploadedFiles.filter(f => f.category === 'buyers' && f.personId === buyer.id);

    totalRequired += docsForThisBuyer.length;
    validatedRequired += docsForThisBuyer.filter(doc =>
      buyerFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true)
    ).length;
  });

  // Imóvel
  const propertyRequiredDocs = checklist.imovel.documentos.filter(d => d.obrigatorio);
  const propertyFiles = uploadedFiles.filter(f => f.category === 'property');
  propertyRequiredDocs.forEach(doc => {
    if (doc.id === 'MATRICULA') {
      totalRequired += deedCountClamped;
      const validatedCount = propertyFiles.filter(f => fileSatisfiesType(f, doc.id) && f.validated === true).length;
      validatedRequired += Math.min(validatedCount, deedCountClamped);
      return;
    }

    totalRequired += 1;
    const hasValidated = propertyFiles.some(f => fileSatisfiesType(f, doc.id) && f.validated === true);
    validatedRequired += hasValidated ? 1 : 0;
  });

  // Calcular documentos enviados e validados
  const pendingCount = uploadedFiles.filter(f => f.validated === undefined).length;

  // Calcular progresso (apenas validados)
  const progress = totalRequired > 0 ? Math.round((validatedRequired / totalRequired) * 100) : 0;

  // Cor da complexidade
  const getComplexityColor = (complexity: string) => {
    switch (complexity) {
      case 'BAIXA':
        return 'text-green-600 bg-green-50';
      case 'MEDIA':
        return 'text-blue-600 bg-blue-50';
      case 'MEDIA_ALTA':
        return 'text-yellow-600 bg-yellow-50';
      case 'ALTA':
        return 'text-orange-600 bg-orange-50';
      case 'MUITO_ALTA':
        return 'text-red-600 bg-red-50';
      default:
        return 'text-slate-600 bg-slate-50';
    }
  };

  // Formatar data
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const translateComplexity = (complexity: string) => {
    switch (complexity) {
      case 'BAIXA':
        return 'Baixa';
      case 'MEDIA':
        return 'Média';
      case 'MEDIA_ALTA':
        return 'Média Alta';
      case 'ALTA':
        return 'Alta';
      case 'MUITO_ALTA':
        return 'Muito Alta';
      default:
        return complexity;
    }
  };

  return (
    <div className="bg-gradient-to-br from-primary/5 to-accent/5 rounded-2xl border border-primary/20 p-6 mb-6">
      <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
        <FileText className="w-5 h-5 text-secondary" />
        Resumo do Checklist
      </h3>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Total de Documentos */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <FileText className="w-5 h-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Total Necessário</p>
              <p className="text-2xl font-bold text-slate-800">{totalRequired}</p>
              <p className="text-xs text-slate-400 mt-1">
                {config.sellers.length}V • {config.buyers.length}C • {deedCountClamped}M
              </p>
            </div>
          </div>
        </div>

        {/* Complexidade */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-accent/10 rounded-lg">
              <TrendingUp className="w-5 h-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Complexidade</p>
              <p className={`text-lg font-bold px-2 py-1 rounded-md uppercase inline-block ${getComplexityColor(checklist.resumo.complexidadeMaxima)}`}>
                {translateComplexity(checklist.resumo.complexidadeMaxima)}
              </p>
            </div>
          </div>
        </div>

        {/* Prazo Estimado */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Calendar className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Prazo Estimado</p>
              <p className="text-2xl font-bold text-slate-800">{checklist.resumo.prazoEstimadoDias} dias</p>
            </div>
          </div>
        </div>

        {/* Progresso */}
        <div className="bg-white rounded-lg p-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <CheckCircle2 className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-slate-500">Validados</p>
              <p className="text-2xl font-bold text-slate-800">{validatedRequired}/{totalRequired}</p>
              {pendingCount > 0 && (
                <p className="text-xs text-yellow-600 mt-1">
                  +{pendingCount} validando
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Barra de Progresso */}
      <div className="bg-white rounded-lg p-4 shadow-sm">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-slate-700">Documentos Obrigatórios</span>
          <span className="text-sm font-bold text-primary">{progress}%</span>
        </div>
        <div className="w-full bg-slate-200 rounded-full h-3 overflow-hidden">
          <div
            className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="text-xs text-slate-500 mt-2">
          Conclusão estimada: {formatDate(checklist.resumo.dataEstimadaConclusao)}
        </p>
      </div>
    </div>
  );
};
