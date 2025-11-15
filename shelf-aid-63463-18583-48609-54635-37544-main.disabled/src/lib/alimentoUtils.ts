import { Alimento, AlimentoComputado } from '@/types/alimento';
import { addDays, differenceInDays, parseISO } from 'date-fns';

export function calcularCamposComputados(alimento: Alimento): AlimentoComputado {
  const hoje = new Date();
  
  // Validar e parsear datas com fallback
  let dataValidade = parseISO(alimento.dataValidade);
  let dataFabricacao = parseISO(alimento.dataFabricacao);
  
  // Se as datas são inválidas, usar hoje como fallback
  if (isNaN(dataValidade.getTime())) {
    dataValidade = hoje;
  }
  if (isNaN(dataFabricacao.getTime())) {
    dataFabricacao = hoje;
  }
  
  const diasRestantes = differenceInDays(dataValidade, hoje);
  
  // Usa configuração de alertas do alimento
  const diasInspecao = alimento.alertas?.contarAPartirFabricacaoDias || 10;
  const dataInspecao = addDays(dataFabricacao, diasInspecao).toISOString().split('T')[0];
  
  let status: AlimentoComputado['status'];
  if (diasRestantes < 0) {
    status = 'VENCIDO';
  } else if (diasRestantes <= 7) {
    status = 'VENCE EM BREVE';
  } else {
    status = 'ATIVO';
  }
  
  // Calcula alerta baseado em 1/3 da validade se configurado
  let diasLimiteAlerta = 30;
  if (alimento.alertas?.avisoQuandoUmTercoValidade) {
    const diasTotaisValidade = differenceInDays(dataValidade, dataFabricacao);
    diasLimiteAlerta = Math.floor(diasTotaisValidade / 3);
  }
  
  const alerta: AlimentoComputado['alerta'] = diasRestantes <= diasLimiteAlerta ? 'AMARELO' : 'NENHUM';
  
  // Calcular peso total baseado na unidade
  const pesoTotal = alimento.unidade === 'caixa' && alimento.pesoPorCaixa
    ? alimento.quantidade * alimento.pesoPorCaixa
    : alimento.quantidade;
  
  return {
    ...alimento,
    dataInspecao,
    status,
    alerta,
    diasRestantes,
    pesoTotal,
  };
}

export function getStatusColor(status: AlimentoComputado['status']): string {
  switch (status) {
    case 'VENCIDO':
      return 'destructive';
    case 'VENCE EM BREVE':
      return 'warning';
    case 'ATIVO':
      return 'success';
    default:
      return 'secondary';
  }
}
