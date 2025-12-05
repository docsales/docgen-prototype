
import React from 'react';
import { Input, Select, Checkbox } from '../../../components/Inputs';
import { DealConfig } from '../../../types/types';
import { 
  FileText, 
  Wallet, 
  Users2, 
  Landmark, 
  PiggyBank, 
  Banknote,
  ScrollText
} from 'lucide-react';

interface ConfigStepProps {
  data: DealConfig;
  onChange: (d: Partial<DealConfig>) => void;
}

// Utility Component for Toggle Cards
const ToggleCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  checked: boolean;
  onChange: (c: boolean) => void;
}> = ({ icon, title, checked, onChange }) => (
  <div 
    onClick={() => onChange(!checked)}
    className={`
      cursor-pointer p-4 rounded-xl border-2 transition-all duration-200 flex flex-col items-center justify-center gap-3 text-center
      ${checked 
        ? 'border-primary bg-blue-50 text-primary shadow-sm' 
        : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-50'
      }
    `}
  >
    <div className={`p-2 rounded-full ${checked ? 'bg-white' : 'bg-slate-100'}`}>
      {icon}
    </div>
    <span className="font-semibold text-sm">{title}</span>
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${checked ? 'border-primary bg-primary' : 'border-slate-300'}`}>
        {checked && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
    </div>
  </div>
);

// Utility for Counters
const CounterInput: React.FC<{
  label: string;
  value: number;
  onChange: (v: number) => void;
  typeValue: 'PF' | 'PJ';
  onTypeChange: (t: 'PF' | 'PJ') => void;
}> = ({ label, value, onChange, typeValue, onTypeChange }) => (
  <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
    <div className="flex justify-between items-center mb-3">
        <label className="font-semibold text-slate-700">{label}</label>
        {/* Segmented Control */}
        <div className="flex bg-slate-200 p-0.5 rounded-lg">
            {(['PF', 'PJ'] as const).map((type) => (
                <button
                    key={type}
                    onClick={() => onTypeChange(type)}
                    className={`
                        px-3 py-1 text-xs font-bold rounded-md transition-all
                        ${typeValue === type 
                            ? 'bg-white text-slate-800 shadow-sm' 
                            : 'text-slate-500 hover:text-slate-700'
                        }
                    `}
                >
                    {type}
                </button>
            ))}
        </div>
    </div>
    <div className="flex items-center gap-2">
        <button 
            onClick={() => onChange(Math.max(1, value - 1))}
            className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-600 font-bold text-lg"
        >
            -
        </button>
        <div className="flex-1 text-center font-bold text-xl text-slate-800 bg-white border border-slate-200 rounded-lg h-10 flex items-center justify-center">
            {value}
        </div>
        <button 
            onClick={() => onChange(value + 1)}
            className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-600 font-bold text-lg"
        >
            +
        </button>
    </div>
  </div>
);

export const ConfigStep: React.FC<ConfigStepProps> = ({ data, onChange }) => {
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Basic Info Card */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
            <FileText className="w-5 h-5 text-accent" />
            <h3 className="font-bold text-slate-800">Dados do Contrato</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="md:col-span-2">
                <Input 
                    label="Nome do Contrato (Identificação)" 
                    placeholder="Ex: Compra e Venda - Apto 32B Ed. Horizon" 
                    value={data.name} 
                    maxLength={80}
                    onChange={(e) => onChange({ name: e.target.value })}
                />
            </div>
            <div>
                 <Select
                    label="Modelo de Minuta"
                    value={data.contractModel}
                    onChange={(e) => onChange({ contractModel: e.target.value })}
                    options={[
                        { value: "venda_compra_padrao", label: "Compra e Venda Padrão" },
                        { value: "locacao_residencial", label: "Locação Residencial" },
                        { value: "locacao_comercial", label: "Locação Comercial" },
                        { value: "escritura_publica", label: "Escritura Pública de Compra e Venda" },
                        { value: "doacao_imovel", label: "Doação de Imóvel" },
                        { value: "inventario_extrajudicial", label: "Inventário Extrajudicial" }
                    ]}
                 />
            </div>
        </div>
      </section>

      {/* 2. Commercial Conditions */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-primary" />
            <h3 className="font-bold text-slate-800">Condições de Pagamento</h3>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <ToggleCard 
                icon={<PiggyBank className="w-6 h-6" />}
                title="Utilizar FGTS"
                checked={data.useFgts}
                onChange={(c) => onChange({ useFgts: c })}
            />
            <ToggleCard 
                icon={<Landmark className="w-6 h-6" />}
                title="Financiamento Bancário"
                checked={data.bankFinancing}
                onChange={(c) => onChange({ bankFinancing: c })}
            />
            <ToggleCard 
                icon={<Banknote className="w-6 h-6" />}
                title="Carta de Consórcio"
                checked={data.consortiumLetter}
                onChange={(c) => onChange({ consortiumLetter: c })}
            />
        </div>
      </section>

      {/* 3. Parties Involved */}
      <section className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-slate-50/50 p-4 border-b border-slate-100 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-slate-600" />
            <h3 className="font-bold text-slate-800">Partes & Imóvel</h3>
        </div>
        <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <CounterInput 
                    label="Vendedores"
                    value={data.sellersCount}
                    onChange={(v) => onChange({ sellersCount: v })}
                    typeValue={data.sellersType}
                    onTypeChange={(t) => onChange({ sellersType: t })}
                />
                
                <div className="flex flex-col gap-3">
                    <CounterInput 
                        label="Compradores"
                        value={data.buyersCount}
                        onChange={(v) => onChange({ buyersCount: v, isSpouse: v <= 1 ? false : data.isSpouse })}
                        typeValue={data.buyersType}
                        onTypeChange={(t) => onChange({ buyersType: t })}
                    />
                    {data.buyersCount > 1 && (
                        <div className="animate-in fade-in slide-in-from-top-2">
                            <Checkbox 
                                label="É Cônjuge?"
                                checked={data.isSpouse}
                                onChange={(e) => onChange({ isSpouse: e.target.checked })}
                            />
                        </div>
                    )}
                </div>
                
                {/* Deeds / Property Info */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 flex flex-col justify-between">
                     <div className="flex items-center gap-2 mb-3">
                        <ScrollText className="w-4 h-4 text-slate-500" />
                        <label className="font-semibold text-slate-700">Matrículas</label>
                     </div>
                     <div className="flex items-center gap-2">
                        <button 
                            onClick={() => onChange({ deedCount: Math.max(1, data.deedCount - 1) })}
                            className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-600 font-bold text-lg"
                        >
                            -
                        </button>
                        <div className="flex-1 text-center font-bold text-xl text-slate-800 bg-white border border-slate-200 rounded-lg h-10 flex items-center justify-center">
                            {data.deedCount}
                        </div>
                        <button 
                            onClick={() => onChange({ deedCount: data.deedCount + 1 })}
                            className="w-10 h-10 rounded-lg bg-white border border-slate-300 flex items-center justify-center hover:bg-slate-100 text-slate-600 font-bold text-lg"
                        >
                            +
                        </button>
                    </div>
                </div>
            </div>
        </div>
      </section>
      
    </div>
  );
};
