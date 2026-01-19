import type { Deal } from '@/types/types';

/**
 * Interface para dados extraídos de documentos
 */
interface ExtractedPropertyData {
  address?: string;
  area?: string;
  matricula?: string;
  cartorio?: string;
  valor?: string;
  entrada?: string;
  statusJuridico?: {
    situacao: string;
    onusAtivos: any[];
    alertas: string[];
  };
}

export interface ExtractedPerson {
  name: string;
  email?: string;
  phone?: string;
  cpf?: string;
  rg?: string;
  address?: string;
  dataSource?: string;
}

interface ExtractedFinancialData {
  valor?: string;
  entrada?: string;
  financiamento: string;
  fgts: string;
  consorcio: string;
}

interface MergedDealData {
  id: string;
  name?: string;
  status: any;
  type: string;
  date: string;
  address: string;
  area: string;
  matricula: string;
  cartorio: string;
  valor: string;
  entrada: string;
  financiamento: string;
  fgts: string;
  consorcio: string;
  buyers: ExtractedPerson[];
  sellers: ExtractedPerson[];
  docs: any[];
  alerts?: string[];
  statusJuridico?: any;
  createdAt: string;
  updatedAt: string;
  metadata?: any;
}

/**
 * Helper global para garantir valores string seguros
 */
function safeString(value: any): string {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof value === 'boolean') return value ? 'Sim' : 'Não';
  if (typeof value === 'object') {
    // Se for objeto, tentar extrair um campo de nome/texto comum
    if (value.nome) return safeString(value.nome);
    if (value.name) return safeString(value.name);
    if (value.text) return safeString(value.text);
    if (value.valor) return safeString(value.valor);
    if (value.value) return safeString(value.value);
    // Se nenhum campo conhecido, retornar vazio (não serializar o objeto)
    return '';
  }
  return String(value);
}

/**
 * Extrai dados de pessoas (compradores ou vendedores) de contractFields
 * Busca padrão: buyers.1.nome, sellers.2.cpf, etc.
 */
export function extractPersonsFromContractFields(
  contractFields: any,
  category: 'buyers' | 'sellers'
): ExtractedPerson[] {
  if (!contractFields) return [];

  const persons = new Map<number, ExtractedPerson>();
  const prefix = category === 'buyers' ? 'buyers.' : 'sellers.';

  // Buscar todos os campos com padrão buyers.1.*, buyers.2.*, etc.
  Object.keys(contractFields).forEach(key => {
    // Ignorar campos customer.*
    if (key.startsWith('customer.')) return;
    if (!key.startsWith(prefix)) return;

    // Extrair: buyers.1.nome -> index=1, field=nome
    const match = key.match(/^(buyers|sellers)\.(\d+)\.(.+)$/);
    if (!match) return;

    const index = parseInt(match[2]);
    const field = match[3];
    const value = contractFields[key];

    if (!value || (typeof value === 'string' && value.trim() === '')) return;

    // Obter pessoa ou criar nova
    let person = persons.get(index) || {
      name: '',
      dataSource: 'contractFields',
    };

    // Mapear campos
    switch(field) {
      case 'nome':
        person.name = safeString(value);
        break;
      case 'cpf':
      case 'cpf_cnpj':
        person.cpf = safeString(value).replace(/\D/g, ''); // Normalizar
        break;
      case 'endereco':
      case 'endereco_completo':
        person.address = safeString(value);
        break;
      case 'email':
        person.email = safeString(value);
        break;
      case 'telefone':
      case 'celular':
      case 'phone':
        if (!person.phone) person.phone = safeString(value);
        break;
      case 'rg':
        person.rg = safeString(value);
        break;
    }

    persons.set(index, person);
  });

  // Filtrar apenas pessoas com nome válido
  const result = Array.from(persons.values())
    .filter(p => p.name && p.name.trim() !== '' && p.name !== 'Sem nome');

  return result;
}

/**
 * Extrai dados de pessoas (compradores ou vendedores) de preMappings
 * Fallback secundário caso contractFields esteja vazio
 */
export function extractPersonsFromPreMappings(
  preMappings: any,
  category: 'buyers' | 'sellers'
): ExtractedPerson[] {
  if (!preMappings) return [];

  const persons = new Map<number, ExtractedPerson>();
  const prefix = category === 'buyers' ? 'buyers.' : 'sellers.';

  // Buscar todos os campos com padrão buyers.1.*, buyers.2.*, etc.
  Object.keys(preMappings).forEach(key => {
    if (!key.startsWith(prefix)) return;

    // Extrair: buyers.1.nome -> index=1, field=nome
    const match = key.match(/^(buyers|sellers)\.(\d+)\.(.+)$/);
    if (!match) return;

    const index = parseInt(match[2]);
    const field = match[3];
    const mapping = preMappings[key];
    const value = mapping?.value;

    if (!value || (typeof value === 'string' && value.trim() === '')) return;

    // Obter pessoa ou criar nova
    let person = persons.get(index) || {
      name: '',
      dataSource: `preMappings (${mapping?.source || 'unknown'})`,
    };

    // Mapear campos (mesmo padrão de contractFields)
    switch(field) {
      case 'nome':
        person.name = safeString(value);
        break;
      case 'cpf':
      case 'cpf_cnpj':
        person.cpf = safeString(value).replace(/\D/g, '');
        break;
      case 'endereco':
      case 'endereco_completo':
        person.address = safeString(value);
        break;
      case 'email':
        person.email = safeString(value);
        break;
      case 'telefone':
      case 'celular':
      case 'phone':
        if (!person.phone) person.phone = safeString(value);
        break;
      case 'rg':
        person.rg = safeString(value);
        break;
    }

    persons.set(index, person);
  });

  // Filtrar apenas pessoas com nome válido
  const result = Array.from(persons.values())
    .filter(p => p.name && p.name.trim() !== '' && p.name !== 'Sem nome');

  return result;
}

/**
 * Extrai dados do imóvel de documentos tipo MATRICULA
 */
export function extractPropertyData(documents: any[]): ExtractedPropertyData {
  const matriculaDoc = documents?.find(
    (doc) => doc.documentType === 'MATRICULA' && doc.variables
  );

  if (!matriculaDoc?.variables) {
    return {};
  }

  const vars = matriculaDoc.variables;
  const propertyData: ExtractedPropertyData = {};

  // Endereço do imóvel
  if (vars.imovel?.endereco_completo) {
    propertyData.address = vars.imovel.endereco_completo;
  }

  // Área (terreno + construída)
  if (vars.imovel?.area_terreno_m2 || vars.imovel?.area_construida_m2) {
    const terreno = vars.imovel.area_terreno_m2
      ? `${vars.imovel.area_terreno_m2}m² terreno`
      : '';
    const construida = vars.imovel.area_construida_m2
      ? `${vars.imovel.area_construida_m2}m² construída`
      : '';
    propertyData.area = [terreno, construida].filter(Boolean).join(', ');
  }

  // Matrícula
  if (vars.matricula?.numero) {
    propertyData.matricula = vars.matricula.numero;
  }

  // Cartório
  if (vars.matricula?.cartorio) {
    propertyData.cartorio = vars.matricula.cartorio;
  }

  // Valor de aquisição (se disponível)
  if (vars.aquisicao?.valor_transacao) {
    propertyData.valor = `R$ ${vars.aquisicao.valor_transacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
  }

  // Status jurídico
  if (vars.status_juridico) {
    propertyData.statusJuridico = {
      situacao: vars.status_juridico.situacao || 'DESCONHECIDO',
      onusAtivos: vars.status_juridico.onus_ativos || [],
      alertas: vars.validacao?.alertas || [],
    };
  }

  return propertyData;
}

/**
 * Extrai dados de pessoas (compradores ou vendedores) dos documentos
 */
export function extractPersonsData(
  documents: any[],
  category: 'buyers' | 'sellers' | 'property'
): ExtractedPerson[] {
  if (!documents || documents.length === 0) {
    return [];
  }

  // Filtrar documentos pela categoria
  const categoryDocs = documents.filter((doc) => doc.category === category);

  // Agrupar por personId
  const personMap = new Map<string, ExtractedPerson>();

  // Helper para garantir que sempre retornamos string
  const ensureString = (value: any): string | undefined => {
    if (!value) return undefined;
    if (typeof value === 'string') return value;
    if (typeof value === 'object') return JSON.stringify(value);
    return String(value);
  };

  categoryDocs.forEach((doc) => {
    if (!doc.variables) return;

    const personId = doc.personId || 'unknown';
    const vars = doc.variables;

    // Tratamento especial para Certidão de Casamento - pode ter 2 pessoas
    if (doc.documentType === 'CERTIDAO_CASAMENTO') {
      const conjuge1 = vars.conjuge_1;
      const conjuge2 = vars.conjuge_2;

      // Processar cônjuge 1
      if (conjuge1?.nome_completo) {
        const person1 = personMap.get(personId) || {
          name: '',
          dataSource: '',
        };

        if (!person1.name) {
          person1.name = ensureString(conjuge1.nome_completo) || '';
          person1.dataSource = 'Certidão de Casamento';
        }
        if (conjuge1.cpf && !person1.cpf) {
          person1.cpf = ensureString(conjuge1.cpf);
        }

        if (person1.name) {
          personMap.set(personId, person1);
        }
      }

      // Processar cônjuge 2 (criar entrada separada)
      if (conjuge2?.nome_completo) {
        // Usar um ID diferente para o cônjuge 2
        const conjuge2Id = `${personId}-conjuge2`;
        const person2 = personMap.get(conjuge2Id) || {
          name: '',
          dataSource: '',
        };

        if (!person2.name) {
          person2.name = ensureString(conjuge2.nome_completo) || '';
          person2.dataSource = 'Certidão de Casamento';
        }
        if (conjuge2.cpf && !person2.cpf) {
          person2.cpf = ensureString(conjuge2.cpf);
        }

        if (person2.name) {
          personMap.set(conjuge2Id, person2);
        }
      }

      return; // Já processamos, pular para próximo documento
    }

    // Obter pessoa existente ou criar nova (para outros tipos de documentos)
    let person = personMap.get(personId) || {
      name: '',
      dataSource: '',
    };

    // Extrair dados dependendo do tipo de documento
    if (doc.documentType === 'RG' || doc.documentType === 'CNH' || doc.documentType === 'CNI') {
      // Documentos de identificação
      if (vars.titular?.nome_completo && !person.name) {
        person.name = ensureString(vars.titular.nome_completo) || '';
        person.dataSource = doc.documentType;
      }
      if (vars.titular?.cpf && !person.cpf) {
        person.cpf = ensureString(vars.titular.cpf);
      }
      if (vars.titular?.rg && !person.rg) {
        person.rg = ensureString(vars.titular.rg);
      }
    } else if (doc.documentType === 'COMPROVANTE_RESIDENCIA') {
      // Comprovante de residência
      if (vars.nome && !person.name) {
        person.name = ensureString(vars.nome) || '';
        person.dataSource = 'Comprovante de Residência';
      }
      if (vars.cpf_cnpj && !person.cpf) {
        person.cpf = ensureString(vars.cpf_cnpj);
      }
      if (vars.endereco_completo && !person.address) {
        person.address = ensureString(vars.endereco_completo);
      }
    }

    // Atualizar no map
    if (person.name) {
      personMap.set(personId, person);
    }
  });

  // Filtrar pessoas sem nome válido e "Sem nome"
  const result = Array.from(personMap.values()).filter((p) => {
    const hasValidName = p.name && p.name.trim() !== '' && p.name !== 'Sem nome';
    return hasValidName;
  });

  return result;
}

/**
 * Extrai dados de pessoas (compradores ou vendedores) usando múltiplas fontes
 * Prioridade: contractFields > preMappings > documents
 */
export function extractAllPersonsData(
  dealData: Deal,
  category: 'buyers' | 'sellers'
): ExtractedPerson[] {
  let persons: ExtractedPerson[] = [];

  if (dealData.contractFields) {
    persons = extractPersonsFromContractFields(dealData.contractFields, category);
    if (persons.length > 0) return persons;
  }

  if (dealData.preMappings) {
    persons = extractPersonsFromPreMappings(dealData.preMappings, category);
    if (persons.length > 0) return persons;
  }

  if (dealData.documents) {
    persons = extractPersonsData(dealData.documents, category);
    if (persons.length > 0) return persons;
  }

  return [];
}

/**
 * Extrai condições comerciais dos documentos e metadata
 */
export function extractFinancialData(
  documents: any[],
  metadata: any
): ExtractedFinancialData {
  const financialData: ExtractedFinancialData = {
    financiamento: metadata?.bankFinancing ? 'Sim' : 'Não',
    fgts: metadata?.useFgts ? 'Sim' : 'Não',
    consorcio: metadata?.consortiumLetter ? 'Sim' : 'Não',
  };

  // Tentar extrair valores da matrícula
  const matriculaDoc = documents?.find(
    (doc) => doc.documentType === 'MATRICULA' && doc.variables
  );

  if (matriculaDoc?.variables?.aquisicao) {
    const aquisicao = matriculaDoc.variables.aquisicao;

    if (aquisicao.valor_transacao) {
      financialData.valor = `R$ ${aquisicao.valor_transacao.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
    }
  }

  return financialData;
}

/**
 * Função principal que mescla todos os dados do deal
 * Prioridade: variables dos documentos > metadata > fallback
 */
export function mergeDealData(dealData: Deal): MergedDealData {
  const metadata = dealData.metadata || {};
  const documents = dealData.documents || [];

  const propertyData = extractPropertyData(documents);
  
  const buyers = extractAllPersonsData(dealData, 'buyers');
  const sellers = extractAllPersonsData(dealData, 'sellers');
  
  const financialData = extractFinancialData(documents, metadata);

  const alerts: string[] = [];
  if (propertyData.statusJuridico?.alertas) {
    alerts.push(...propertyData.statusJuridico.alertas);
  }

  // Verificar documentos com problemas
  documents.forEach((doc: any) => {
    if (doc.status === 'ERROR') {
      alerts.push(`Erro ao processar: ${doc.originalFilename || 'documento'}`);
    }
    if (doc.variables?.validacao?.status === 'VENCIDO') {
      alerts.push(`Documento vencido: ${doc.originalFilename || doc.documentType}`);
    }
  });

  // Montar objeto final com prioridades (garantindo sempre strings)
  return {
    id: dealData.id,
    name: dealData.name,
    status: dealData.status,
    type: dealData.name?.includes('Aluguel') ? 'Locação' : 'Compra e Venda',
    date: new Date(dealData.createdAt).toLocaleDateString('pt-BR'),

    // Dados do imóvel (prioridade: documentos > metadata > fallback)
    address: safeString(propertyData.address || metadata.address) || 'Não informado',
    area: safeString(propertyData.area || metadata.area) || 'Não informado',
    matricula: safeString(propertyData.matricula || metadata.matricula) || 'Não informado',
    cartorio: safeString(propertyData.cartorio || metadata.cartorio) || 'Não informado',

    // Condições financeiras
    valor: safeString(financialData.valor || metadata.valor) || 'Não informado',
    entrada: safeString(metadata.entrada) || 'Não informado',
    financiamento: safeString(financialData.financiamento),
    fgts: safeString(financialData.fgts),
    consorcio: safeString(financialData.consorcio),

    // Partes envolvidas
    buyers,
    sellers,

    // Documentos
    docs: documents,

    // Alertas e status jurídico
    alerts: alerts.length > 0 ? alerts : undefined,
    statusJuridico: propertyData.statusJuridico,

    // Dados originais
    createdAt: dealData.createdAt,
    updatedAt: dealData.updatedAt,
    metadata: dealData.metadata,
  };
}

/**
 * Formata CPF para exibição
 */
export function formatCPF(cpf?: string): string {
  if (!cpf) return '';
  const cleaned = cpf.replace(/\D/g, '');
  if (cleaned.length !== 11) return cpf;
  return cleaned.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4');
}

/**
 * Formata RG para exibição
 */
export function formatRG(rg?: string): string {
  if (!rg) return '';
  return rg;
}

