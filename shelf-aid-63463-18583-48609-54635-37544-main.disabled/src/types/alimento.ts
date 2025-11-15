export interface AlertasConfig {
  contarAPartirFabricacaoDias: number;
  avisoQuandoUmTercoValidade: boolean;
  popUpNotificacoes: boolean;
}

export interface Metadata {
  timestampCadastro: string;
  usuarioResponsavel: string;
}

export interface Alimento {
  codigo: number;
  codigoProduto: string;
  nome: string;
  unidade: 'kg' | 'caixa';
  lote: string;
  dataFabricacao: string;
  dataValidade: string;
  quantidade: number;
  pesoPorCaixa?: number;
  temperatura: string;
  shelfLife: number;
  dataEntrada: string;
  dataSaida?: string;
  departamento: string;
  alertas: AlertasConfig;
  metadata: Metadata;
  cadastradoPor: string;
}

export interface AlimentoComputado extends Alimento {
  dataInspecao: string;
  status: 'VENCIDO' | 'VENCE EM BREVE' | 'ATIVO';
  alerta: 'AMARELO' | 'NENHUM';
  diasRestantes: number;
  pesoTotal: number;
}

export type AlimentoFormData = Omit<Alimento, 'codigo' | 'metadata' | 'cadastradoPor'>;
