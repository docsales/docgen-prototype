
export interface Deal {
  id: string;
  name: string;
  status: 'preparation' | 'sent' | 'signed';
  createdAt: string;
  clientName: string;
}

export interface Signatory {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: 'comprador' | 'vendedor' | 'testemunha' | 'corretor';
}

export interface UploadedFile {
  id: string;
  file: File;
  type: string; // The selected document type (e.g., 'rg', 'iptu')
}

export interface DealConfig {
  name: string;
  contractModel: string;
  useFgts: boolean;
  bankFinancing: boolean;
  consortiumLetter: boolean;
  sellersCount: number;
  sellersType: 'PF' | 'PJ';
  buyersCount: number;
  buyersType: 'PF' | 'PJ';
  deedCount: number;
  isSpouse?: boolean;
}

// Mock OCR Data Structure based on prompt
export const MOCK_OCR_DATA = {
  "nome": "ALCINO ALVES DA SILVA",
  "cpf_cnpj": "1*.. ***-71",
  "cpf_cnpj_formatado": "CPF parcialmente mascarado (últimos dígitos: 71)",
  "tipo_pessoa": "FÍSICA",
  "endereco_completo": "RUA 123, 27, SÃO PAULO, 12345-543 - SANTANA - SP",
  "documento": {
    "tipo": "CONTA DE LUZ",
    "subtipo": "Energia Elétrica",
    "empresa": "Enel Eletropaulo",
    "cnpj_empresa": "12.234567/0001-11",
    "mes_referencia": "02/2025",
    "valor_total": 236.86
  },
  "endereco": {
    "logradouro": "Rua Diogo Lara de Moraes",
    "numero": "27",
    "bairro": "Jardim São Luiz",
    "cidade": "Santana de Parnaíba",
    "estado": "SP",
    "cep_formatado": "12345-567",
    "tipo_imovel": "RESIDENCIAL"
  }
};

export const CONTRACT_FIELDS = [
  { id: 'seller_name', label: 'Nome do Vendedor' },
  { id: 'seller_cpf', label: 'CPF do Vendedor' },
  { id: 'seller_address', label: 'Endereço Completo' },
  { id: 'property_city', label: 'Cidade do Imóvel' },
  { id: 'property_zip', label: 'CEP do Imóvel' },
  { id: 'doc_ref_month', label: 'Mês Referência (Comp. Res.)' }
];

export const MOCK_DEALS: Deal[] = [
  { id: '1', name: 'Compra Apto Jardins', status: 'preparation', createdAt: '2023-10-25', clientName: 'Roberto Carlos' },
  { id: '2', name: 'Venda Casa Morumbi', status: 'sent', createdAt: '2023-10-20', clientName: 'Ana Maria' },
  { id: '3', name: 'Aluguel Galpão', status: 'signed', createdAt: '2023-10-15', clientName: 'Empresa XYZ' },
  { id: '4', name: 'Terreno Interior', status: 'preparation', createdAt: '2023-10-26', clientName: 'João da Silva' },
];
