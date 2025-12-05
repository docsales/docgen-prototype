
import React, { useState, ReactElement } from 'react';
import { Button } from '../../../components/Button';
import { 
    UploadCloud, FileCheck, ArrowRight, X, 
    CreditCard, Home, FileText, MapPin, Building2, FileQuestion 
} from 'lucide-react';
import { UploadedFile } from '../../../types/types';
import { GoogleGenAI, Type } from "@google/genai";

interface DocumentsStepProps {
    files: UploadedFile[];
    onFilesChange: (files: UploadedFile[]) => void;
    onNext: () => void;
    onAnalysisComplete?: (data: any) => void;
}

export const DocumentsStep: React.FC<DocumentsStepProps> = ({ files, onFilesChange, onNext, onAnalysisComplete }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [currentFile, setCurrentFile] = useState<File | null>(null);
  const [docType, setDocType] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCurrentFile(e.target.files[0]);
      setModalOpen(true);
      setDocType(''); // Reset selection
    }
  };

  const saveFile = () => {
    if(currentFile && docType) {
        const newFile: UploadedFile = {
            id: Date.now().toString(),
            file: currentFile,
            type: docType
        };
        onFilesChange([...files, newFile]);
        setModalOpen(false);
        setCurrentFile(null);
    }
  }

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const processDocuments = async () => {
    if (files.length === 0) {
        onNext();
        return;
    }

    setIsProcessing(true);
    
    try {
        // Process the first file for demonstration, or could loop through all
        const fileToProcess = files[0].file;
        const base64Data = await fileToBase64(fileToProcess);

        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    {
                        inlineData: {
                            mimeType: fileToProcess.type || 'image/png',
                            data: base64Data
                        }
                    },
                    { text: "Extract data from this document in JSON format. Capture personal info, address, and document specific details." }
                ]
            },
            config: {
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        nome: { type: Type.STRING },
                        cpf_cnpj: { type: Type.STRING },
                        tipo_pessoa: { type: Type.STRING },
                        endereco_completo: { type: Type.STRING },
                        documento: {
                            type: Type.OBJECT,
                            properties: {
                                tipo: { type: Type.STRING },
                                subtipo: { type: Type.STRING },
                                empresa: { type: Type.STRING },
                                cnpj_empresa: { type: Type.STRING },
                                mes_referencia: { type: Type.STRING },
                                valor_total: { type: Type.NUMBER }
                            }
                        },
                        endereco: {
                            type: Type.OBJECT,
                            properties: {
                                logradouro: { type: Type.STRING },
                                numero: { type: Type.STRING },
                                bairro: { type: Type.STRING },
                                cidade: { type: Type.STRING },
                                estado: { type: Type.STRING },
                                cep_formatado: { type: Type.STRING },
                                tipo_imovel: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        });

        const text = response.text;
        if (text && onAnalysisComplete) {
            const data = JSON.parse(text);
            onAnalysisComplete(data);
        }
        
        onNext();
    } catch (error) {
        console.error("Error processing documents with Gemini:", error);
        // Fallback to next step even if error, or handle error UI
        onNext();
    } finally {
        setIsProcessing(false);
    }
  };

  const removeFile = (idToRemove: string) => {
      onFilesChange(files.filter(f => f.id !== idToRemove));
  };

  // Modern Document Type Options
  const docTypes = [
      { id: 'rg', label: 'RG / CPF / CNH', icon: <CreditCard className="w-6 h-6" /> },
      { id: 'matricula', label: 'Matrícula do Imóvel', icon: <Home className="w-6 h-6" /> },
      { id: 'iptu', label: 'IPTU', icon: <Building2 className="w-6 h-6" /> },
      { id: 'residencia', label: 'Comp. Residência', icon: <MapPin className="w-6 h-6" /> },
      { id: 'contrato_social', label: 'Contrato Social', icon: <FileText className="w-6 h-6" /> },
      { id: 'outros', label: 'Outros', icon: <FileQuestion className="w-6 h-6" /> },
  ];

  const getDocTypeInfo = (typeId: string) => {
      return docTypes.find(d => d.id === typeId) || { label: 'Desconhecido', icon: <FileQuestion /> };
  };

  if (isProcessing) {
      return (
          <div className="flex flex-col items-center justify-center h-96 space-y-8 animate-in fade-in">
              <div className="relative w-32 h-40 bg-white border-2 border-slate-200 rounded-lg shadow-lg overflow-hidden flex flex-col">
                  {/* Fake Document Content */}
                  <div className="p-4 space-y-2 opacity-30">
                      <div className="h-2 w-1/2 bg-slate-400 rounded"></div>
                      <div className="h-2 w-full bg-slate-300 rounded"></div>
                      <div className="h-2 w-3/4 bg-slate-300 rounded"></div>
                      <div className="h-2 w-full bg-slate-300 rounded"></div>
                      <div className="h-20 w-full bg-slate-100 rounded mt-4"></div>
                  </div>
                  
                  {/* Scanning Line */}
                  <div className="absolute left-0 right-0 h-1 bg-accent shadow-[0_0_15px_rgba(239,4,116,0.6)] animate-[scan_2s_ease-in-out_infinite]"></div>
              </div>
              
              <div className="text-center space-y-2">
                <h3 className="text-xl font-bold text-slate-800">Analisando Documentos...</h3>
                <p className="text-slate-500">Extraindo dados com Inteligência Artificial (Gemini)</p>
              </div>

              <style>{`
                @keyframes scan {
                    0% { top: 0%; opacity: 0; }
                    10% { opacity: 1; }
                    90% { opacity: 1; }
                    100% { top: 100%; opacity: 0; }
                }
              `}</style>
          </div>
      )
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Upload Area */}
      <div className="border-2 border-dashed border-slate-300 rounded-2xl p-10 flex flex-col items-center justify-center bg-slate-50 hover:bg-blue-50 hover:border-blue-300 transition-all cursor-pointer group relative">
        <input type="file" className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10" onChange={handleFileChange} />
        <div className="p-4 bg-white rounded-full shadow-sm mb-4 group-hover:scale-110 transition-transform">
            <UploadCloud className="w-10 h-10 text-primary" />
        </div>
        <h4 className="text-lg font-semibold text-slate-800">Arraste seus documentos aqui</h4>
        <p className="text-slate-500 mt-2">Suporta PDF, JPG, PNG (Max 10MB)</p>
        <Button variant="secondary" className="mt-6 pointer-events-none">Selecionar Arquivos</Button>
      </div>

      {/* File List */}
      {files.length > 0 && (
          <div className="space-y-3">
              <h3 className="font-semibold text-slate-800">Documentos Carregados</h3>
              <div className="grid gap-3">
                  {files.map((f, i) => {
                      const typeInfo = getDocTypeInfo(f.type);
                      return (
                        <div key={f.id} className="bg-white p-4 rounded-lg border border-slate-200 flex items-center justify-between shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="bg-green-100 p-2 rounded-lg text-green-700">
                                    <FileCheck className="w-5 h-5" />
                                </div>
                                <div>
                                    <p className="font-medium text-slate-800">{f.file.name}</p>
                                    <div className="flex items-center gap-2 text-xs text-slate-500">
                                        <span>{(f.file.size / 1024 / 1024).toFixed(2)} MB</span>
                                        <span>•</span>
                                        <div className="flex items-center gap-1 text-primary font-semibold">
                                            {typeInfo.icon && React.cloneElement(typeInfo.icon as ReactElement<{ className?: string }>, { className: "w-3 h-3" })}
                                            {typeInfo.label}
                                        </div>
                                    </div>
                                </div>
                            </div>
                            <button onClick={() => removeFile(f.id)} className="text-red-500 hover:text-red-700">
                                <X className="w-5 h-5 rotate-180" />
                            </button>
                        </div>
                      )
                  })}
              </div>
          </div>
      )}
      
      {/* Elegant Modal for Doc Type */}
      {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
              <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
                  <div className="p-6 border-b border-slate-100 flex justify-between items-center">
                      <div>
                          <h3 className="text-xl font-bold text-slate-800">Identificar Documento</h3>
                          <p className="text-sm text-slate-500 mt-1">Selecione o tipo do arquivo: <b>{currentFile?.name}</b></p>
                      </div>
                      <button onClick={() => setModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                          <X className="w-6 h-6" />
                      </button>
                  </div>
                  
                  <div className="p-6 overflow-y-auto">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                          {docTypes.map((type) => (
                              <button
                                key={type.id}
                                onClick={() => setDocType(type.id)}
                                className={`
                                    flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all gap-3
                                    ${docType === type.id 
                                        ? 'border-primary bg-blue-50 text-primary shadow-sm' 
                                        : 'border-slate-100 bg-white text-slate-600 hover:border-blue-200 hover:bg-slate-50'
                                    }
                                `}
                              >
                                  <div className={`p-3 rounded-full ${docType === type.id ? 'bg-white' : 'bg-slate-100'}`}>
                                      {type.icon}
                                  </div>
                                  <span className="font-semibold text-sm text-center">{type.label}</span>
                              </button>
                          ))}
                      </div>
                  </div>

                  <div className="p-6 border-t border-slate-100 bg-slate-50 flex justify-end gap-3">
                      <Button variant="ghost" onClick={() => setModalOpen(false)}>Cancelar</Button>
                      <Button onClick={saveFile} disabled={!docType}>Confirmar & Salvar</Button>
                  </div>
              </div>
          </div>
      )}

      {files.length > 0 && (
          <div className="flex justify-end pt-6">
               <Button onClick={processDocuments} className="w-full md:w-auto text-lg px-8 py-3 h-auto">
                   Processar Documentos <ArrowRight className="w-5 h-5 ml-2" />
               </Button>
          </div>
      )}
    </div>
  );
};
