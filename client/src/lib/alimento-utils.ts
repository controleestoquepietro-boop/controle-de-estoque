import type { Alimento, AlimentoComputado } from '@shared/schema';

export function isAlimentoIncompleto(alimento: Alimento): boolean {
  // Retorna true se faltam campos obrigatórios: data_validade, quantidade, shelf ou temperatura
  return (
    // Considera também falta de `dataEntrada` como incompleto
    !alimento.dataEntrada ||
    !alimento.dataValidade ||
    alimento.quantidade === null ||
    alimento.quantidade === undefined ||
    !alimento.shelfLife ||
    !alimento.temperatura
  );
}

export function calcularCamposComputados(alimento: Alimento): AlimentoComputado {
  try {
    console.log('Calculando campos computados para:', alimento);
    
    const hoje = new Date();
    
    // Garantir que as datas são válidas antes de criar objetos Date
    const fabricacao = alimento.dataFabricacao ? new Date(alimento.dataFabricacao) : hoje;
    if (isNaN(fabricacao.getTime())) {
      console.error('Data de fabricação inválida:', alimento.dataFabricacao);
      throw new Error('Data de fabricação inválida');
    }

    const validade = alimento.dataValidade ? new Date(alimento.dataValidade) : hoje;
    if (isNaN(validade.getTime())) {
      console.error('Data de validade inválida:', alimento.dataValidade);
      throw new Error('Data de validade inválida');
    }

    // Calcular data de inspeção (fabricação + dias configurados)
    const dataInspecao = new Date(fabricacao);
    const diasParaInspecao = alimento.alertasConfig?.contarAPartirFabricacaoDias || 10;
    console.log('Dias para inspeção:', diasParaInspecao); // Debug log
    dataInspecao.setDate(dataInspecao.getDate() + diasParaInspecao);

    // Calcular dias restantes até a validade
    const diasRestantes = Math.ceil((validade.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

    // Determinar status
    let status: 'VENCIDO' | 'VENCE EM BREVE' | 'ATIVO' | 'AGUARDANDO_CADASTRO';
    
    // Primeiro, verificar se o alimento está incompleto
    if (isAlimentoIncompleto(alimento)) {
      status = 'AGUARDANDO_CADASTRO';
    } else if (diasRestantes < 0) {
      status = 'VENCIDO';
    } else if (diasRestantes <= 7) {
      status = 'VENCE EM BREVE';
    } else {
      status = 'ATIVO';
    }

    // Determinar alerta (1/3 da validade)
    const shelfLifeDias = alimento.shelfLife;
    const umTercoValidade = shelfLifeDias / 3;
    const diasDesdeFabricacao = Math.ceil((hoje.getTime() - fabricacao.getTime()) / (1000 * 60 * 60 * 24));
    const alerta: 'AMARELO' | 'NENHUM' =
      alimento.alertasConfig?.avisoQuandoUmTercoValidade && diasDesdeFabricacao >= umTercoValidade
        ? 'AMARELO'
        : 'NENHUM';

    // Calcular peso total
    const pesoTotal =
      alimento.unidade === 'kg'
        ? alimento.quantidade
        : alimento.quantidade * (alimento.pesoPorCaixa || 0);

    return {
      ...alimento,
      dataInspecao: dataInspecao.toISOString().split('T')[0],
      status,
      alerta,
      diasRestantes,
      pesoTotal,
    };
  } catch (error) {
    console.error('Erro ao calcular campos computados:', error);
    // Em vez de lançar, retornamos valores seguros para não quebrar a UI.
    const hoje = new Date();
    const pesoTotalFallback =
      alimento.unidade === 'kg'
        ? alimento.quantidade
        : alimento.quantidade * (alimento.pesoPorCaixa || 0);

    return {
      ...alimento,
      dataInspecao: hoje.toISOString().split('T')[0],
      status: 'ATIVO',
      alerta: 'NENHUM',
      diasRestantes: 0,
      pesoTotal: pesoTotalFallback,
    } as AlimentoComputado;
  }
}

export function getStatusColor(status: string): 'destructive' | 'default' | 'secondary' | 'outline' {
  switch (status) {
    case 'VENCIDO':
      return 'destructive';
    case 'VENCE EM BREVE':
      return 'outline'; // Será amarelo com classe custom
    case 'AGUARDANDO_CADASTRO':
      return 'outline'; // Será laranja com classe custom
    case 'ATIVO':
      return 'default';
    default:
      return 'default';
  }
}

export function getStatusBadgeClass(status: string): string {
  if (status === 'VENCE EM BREVE') {
    return 'bg-yellow-100 text-yellow-800 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-700';
  }
  if (status === 'AGUARDANDO_CADASTRO') {
    return 'bg-orange-100 text-orange-800 border-orange-300 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-700';
  }
  if (status === 'ATIVO') {
    return 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700';
  }
  return '';
}

export function getStatusDisplayLabel(status: string): string {
  // Exibir "não informado" para "AGUARDANDO_CADASTRO"
  if (status === 'AGUARDANDO_CADASTRO') {
    return 'não informado';
  }
  return status;
}
