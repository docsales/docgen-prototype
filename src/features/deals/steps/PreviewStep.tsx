import React, { useState } from 'react';
import { Button } from '../../../components/Button';
import { CheckCircle2, ExternalLink, FileText } from 'lucide-react';

export const PreviewStep: React.FC<{ dealName: string, mappedCount: number, onGenerate: () => void }> = ({ dealName, mappedCount, onGenerate }) => {
    const [status, setStatus] = useState<'idle' | 'generating' | 'done'>('idle');
    
    const handleGenerate = () => {
        setStatus('generating');
        setTimeout(() => setStatus('done'), 3000);
    };
    
    return (
        <div className="flex flex-col items-center justify-center space-y-8 py-10 animate-in fade-in duration-500">
            {status === 'idle' && (
                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 max-w-lg w-full text-center space-y-6">
                    <div className="bg-blue-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <FileText className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">Pronto para gerar o preview?</h3>
                        <p className="text-slate-500 mt-2">Vamos criar um rascunho do seu documento no Google Docs com base nos dados mapeados.</p>
                    </div>
                    
                    <div className="bg-slate-50 p-4 rounded-lg text-left text-sm space-y-2">
                        <div className="flex justify-between">
                            <span className="text-slate-500">Contrato:</span>
                            <span className="font-medium text-slate-800">{dealName}</span>
                        </div>
                         <div className="flex justify-between">
                            <span className="text-slate-500">Variáveis Mapeadas:</span>
                            <span className="font-medium text-slate-800">{mappedCount} campos</span>
                        </div>
                    </div>
                    
                    <Button onClick={handleGenerate} className="w-full text-lg py-3">
                        Gerar Preview do Documento
                    </Button>
                </div>
            )}

            {status === 'generating' && (
                 <div className="text-center space-y-4">
                    <div className="w-20 h-20 border-4 border-slate-200 border-t-accent rounded-full animate-spin mx-auto"></div>
                    <h3 className="text-xl font-bold text-slate-800">Gerando Documento...</h3>
                    <p className="text-slate-500">Aplicando variáveis e criando link no Drive...</p>
                 </div>
            )}

            {status === 'done' && (
                <div className="bg-white p-8 rounded-2xl shadow-lg border border-green-100 max-w-lg w-full text-center space-y-6">
                    <div className="bg-green-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto">
                        <CheckCircle2 className="w-8 h-8 text-green-600" />
                    </div>
                    <div>
                        <h3 className="text-2xl font-bold text-slate-800">Preview Gerado!</h3>
                        <p className="text-slate-500 mt-2">Seu documento foi criado com sucesso. Você pode visualizá-lo e editá-lo antes de enviar.</p>
                    </div>
                    
                    <div className="flex gap-4 flex-col">
                        <Button variant="secondary" className="w-full justify-center" onClick={() => window.open('https://docs.google.com', '_blank')}>
                            <ExternalLink className="w-4 h-4" /> Abrir no Google Docs
                        </Button>
                        <Button onClick={onGenerate} className="w-full justify-center">
                            Avançar para Signatários
                        </Button>
                    </div>
                    <p className="text-xs text-slate-400">Nota: O documento abre em nova aba.</p>
                </div>
            )}
        </div>
    );
};