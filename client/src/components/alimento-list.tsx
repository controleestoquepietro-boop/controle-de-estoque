import type { AlimentoComputado } from '@shared/schema';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getStatusColor, getStatusBadgeClass, getStatusDisplayLabel } from '@/lib/alimento-utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Função para gerar uma cor consistente por usuário
function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash);
}

interface AlimentoListProps {
  alimentos: AlimentoComputado[];
  // auditLogs opcional - usado para mostrar quem deu baixa em cada alimento
  auditLogs?: any[];
  onNovo: () => void;
  onEditar: (alimento: AlimentoComputado) => void;
  onExcluir: (id: number) => void;
  onRegistrarSaida: (id: number) => void;
}

export function AlimentoList({ alimentos, auditLogs = [], onNovo, onEditar, onExcluir, onRegistrarSaida }: AlimentoListProps) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (id: number) => {
    setExpandedItems((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const alimentosFiltrados = useMemo(() => {
    return alimentos.filter((alimento) => {
      const matchBusca =
        busca === '' ||
        alimento.nome.toLowerCase().includes(busca.toLowerCase()) ||
        alimento.lote.toLowerCase().includes(busca.toLowerCase()) ||
        alimento.codigoProduto.toLowerCase().includes(busca.toLowerCase());

      const matchStatus =
        filtroStatus === 'todos' ||
        (filtroStatus === 'ativo' && alimento.status === 'ATIVO') ||
        (filtroStatus === 'vence' && alimento.status === 'VENCE EM BREVE') ||
        (filtroStatus === 'vencido' && alimento.status === 'VENCIDO') ||
        (filtroStatus === 'ni' && alimento.status === 'AGUARDANDO_CADASTRO');

      return matchBusca && matchStatus;
    });
  }, [alimentos, busca, filtroStatus]);

  const estatisticas = useMemo(() => {
    return {
      total: alimentos.length,
      vencidos: alimentos.filter((m) => m.status === 'VENCIDO').length,
      vencemBreve: alimentos.filter((m) => m.status === 'VENCE EM BREVE').length,
      ativos: alimentos.filter((m) => m.status === 'ATIVO').length,
      aguardandoCadastro: alimentos.filter((m) => m.status === 'AGUARDANDO_CADASTRO').length,
    };
  }, [alimentos]);

  return (
    <div className="space-y-6">
      {/* Header com botão Novo */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Controle de Alimentos</h2>
          <p className="text-sm text-muted-foreground">
            Gerencie o estoque e monitore validades
          </p>
        </div>
        <Button data-testid="button-new-alimento" onClick={onNovo} size="lg" className="gap-2">
          <Plus className="h-4 w-4" />
          Novo Alimento
        </Button>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-3xl font-bold" data-testid="stat-total">{estatisticas.total}</div>
            <p className="text-sm text-muted-foreground">Total</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-3xl font-bold text-green-600 dark:text-green-400" data-testid="stat-ativos">
              {estatisticas.ativos}
            </div>
            <p className="text-sm text-muted-foreground">Ativos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400" data-testid="stat-vence-breve">
              {estatisticas.vencemBreve}
            </div>
            <p className="text-sm text-muted-foreground">Vence Breve</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-3xl font-bold text-destructive" data-testid="stat-vencidos">
              {estatisticas.vencidos}
            </div>
            <p className="text-sm text-muted-foreground">Vencidos</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 pb-6">
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400" data-testid="stat-ni">
              {estatisticas.aguardandoCadastro}
            </div>
            <p className="text-sm text-muted-foreground">não informado</p>
          </CardContent>
        </Card>
      </div>

      {/* Busca e Filtros */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                data-testid="input-search"
                placeholder="Buscar por nome, lote ou código..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                data-testid="filter-todos"
                variant={filtroStatus === 'todos' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('todos')}
                size="sm"
              >
                Todos
              </Button>
              <Button
                data-testid="filter-ativo"
                variant={filtroStatus === 'ativo' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('ativo')}
                size="sm"
              >
                Ativos
              </Button>
              <Button
                data-testid="filter-vence"
                variant={filtroStatus === 'vence' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('vence')}
                size="sm"
              >
                Vence Breve
              </Button>
              <Button
                data-testid="filter-vencido"
                variant={filtroStatus === 'vencido' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('vencido')}
                size="sm"
              >
                Vencidos
              </Button>
              <Button
                data-testid="filter-ni"
                variant={filtroStatus === 'ni' ? 'default' : 'outline'}
                onClick={() => setFiltroStatus('ni')}
                size="sm"
              >
                Não informado
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Alimentos */}
      <div className="space-y-4">
        {alimentosFiltrados.length === 0 ? (
          <Card>
            <CardContent className="flex min-h-[200px] items-center justify-center">
              <p className="text-muted-foreground">
                {busca || filtroStatus !== 'todos'
                  ? 'Nenhum alimento encontrado com os filtros aplicados.'
                  : 'Nenhum alimento cadastrado. Clique em "Novo Alimento" para começar.'}
              </p>
            </CardContent>
          </Card>
        ) : (
          alimentosFiltrados.map((alimento) => {
            // encontrar último log de SAIDA para este alimento (se existir)
            const saidaLogs = (auditLogs || []).filter((l: any) => l.action === 'SAIDA' && Number(l.alimentoId) === Number(alimento.id));
            const saidaLogsSorted = saidaLogs.length > 0 ? saidaLogs.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()) : [];
            const lastSaidaLog = saidaLogsSorted[0] || null;
            const baixadoPor = lastSaidaLog ? lastSaidaLog.userName : null;
            const changes = lastSaidaLog?.changes || {};
            const quantidadeSaida = changes.quantidadeSaida;
            const estoqueAntes = changes.estoqueAntes;
            const estoqueDepois = changes.estoqueDepois;
            const quantidadeInicial = changes.quantidadeInicial;
            // data da saída: usar o campo do log se o alimento.dataSaida não estiver preenchido
            const dataSaidaRaw = changes.dataSaida || lastSaidaLog?.timestamp || alimento.dataSaida;
            const dataSaidaFormatted = dataSaidaRaw ? format(new Date(dataSaidaRaw), 'dd/MM/yyyy', { locale: ptBR }) : null;
            // Encontrar log de criação para mostrar quem cadastrou
            const createLog = (auditLogs || []).find((l: any) => l.action === 'CREATE' && Number(l.alimentoId) === Number(alimento.id));
            const cadastradoPor = createLog?.userName;
            const isExpanded = expandedItems.has(alimento.id);
            return (
              <Card key={alimento.id} data-testid={`card-alimento-${alimento.id}`} className="hover-elevate">
                <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(alimento.id)}>
                  <CardContent className="p-6">
                    <div className="flex justify-between items-start gap-4 mb-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <Badge 
                            variant={getStatusColor(alimento.status) as any} 
                            className={getStatusBadgeClass(alimento.status)}
                            data-testid={`badge-status-${alimento.id}`}
                          >
                            {getStatusDisplayLabel(alimento.status)}
                          </Badge>
                          <span className="text-sm text-muted-foreground" data-testid={`text-id-${alimento.id}`}>
                            ID: #{alimento.id}
                          </span>
                        </div>
                        <h3 className="text-lg font-semibold" data-testid={`text-nome-${alimento.id}`}>
                          {alimento.nome}
                        </h3>
                      </div>
                      <CollapsibleTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`button-expand-${alimento.id}`}>
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </CollapsibleTrigger>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-xs text-muted-foreground">Código</span>
                        <p className="font-medium font-mono" data-testid={`text-codigo-${alimento.id}`}>
                          {alimento.codigoProduto}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Lote</span>
                        <p className="font-medium font-mono">{alimento.lote}</p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Quantidade</span>
                        <p className="font-medium">
                          {alimento.quantidade === null || alimento.quantidade === undefined ? 'não informado' : `${alimento.quantidade} ${alimento.unidade}`}
                        </p>
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground">Dias Restantes</span>
                        <p className="font-medium">{alimento.diasRestantes} dias</p>
                      </div>
                    </div>

                    <CollapsibleContent>
                      <div className="border-t pt-4 mt-4">
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                          <div>
                            <span className="text-xs text-muted-foreground">Cadastrado por</span>
                            <p className="font-medium">
                              {cadastradoPor && (
                                <span className="flex items-center gap-2">
                                  <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: (createLog?.userColor as string) || `hsl(${hashCode(cadastradoPor) % 360}, 70%, 40%)` }} />
                                  <span>{cadastradoPor}</span>
                                </span>
                              )}
                            </p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Temperatura</span>
                            <p className="font-medium">{alimento.temperatura || 'não informado'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Shelf Life</span>
                            <p className="font-medium">{alimento.shelfLife ? `${alimento.shelfLife} dias` : 'não informado'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Peso Total</span>
                            <p className="font-medium">{alimento.pesoTotal.toFixed(2)} kg</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Fabricação</span>
                            <p className="font-medium font-mono">{alimento.dataFabricacao || 'não informado'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Validade</span>
                            <p className="font-medium font-mono">{alimento.dataValidade || 'não informado'}</p>
                          </div>
                          <div>
                            <span className="text-xs text-muted-foreground">Entrada</span>
                            <p className="font-medium font-mono">{alimento.dataEntrada || 'não informado'}</p>
                          </div>
                          {saidaLogsSorted.length > 0 && (
                            <div className="space-y-3">
                              <span className="text-xs text-muted-foreground">Saídas recentes</span>
                              <div className="space-y-2">
                                {saidaLogsSorted.map((log: any) => {
                                  const c = log.changes || {};
                                  const dataRaw = c.dataSaida || log.timestamp;
                                  const dataFmt = dataRaw ? format(new Date(dataRaw), 'dd/MM/yyyy HH:mm', { locale: ptBR }) : '';
                                  return (
                                    <div key={`${alimento.id}-saida-${log.id}`} className="p-2 rounded border">
                                      <div className="text-xs text-muted-foreground">{dataFmt}</div>
                                      <div className="mt-1 text-sm">
                                        <div className="flex items-center gap-2">
                                          <span aria-hidden className="inline-block h-3 w-3 rounded-full" style={{ backgroundColor: (log.userColor as string) || `hsl(${hashCode(log.userName) % 360}, 70%, 40%)` }} />
                                          <span className="font-medium">{log.userName}</span>
                                        </div>
                                        <div className="mt-1 text-sm text-muted-foreground">
                                          <div>Quantidade retirada: <span className="font-medium">{c.quantidadeSaida} {alimento.unidade}</span></div>
                                          {c.quantidadeInicial !== undefined && <div>Quantidade cadastrada: <span className="font-medium">{c.quantidadeInicial} {alimento.unidade}</span></div>}
                                          {c.estoqueDepois !== undefined && <div>Estoque atual: <span className="font-medium">{c.estoqueDepois} {alimento.unidade}</span></div>}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </CollapsibleContent>

                    <div className="flex flex-wrap gap-2 mt-4">
                      {!alimento.dataSaida && (
                        <Button
                          data-testid={`button-saida-${alimento.id}`}
                          variant="default"
                          size="sm"
                          onClick={() => onRegistrarSaida(alimento.id)}
                        >
                          Registrar Saída
                        </Button>
                      )}
                      <Button
                        data-testid={`button-edit-${alimento.id}`}
                        variant="outline"
                        size="sm"
                        onClick={() => onEditar(alimento)}
                      >
                        Editar
                      </Button>
                      <Button
                        data-testid={`button-delete-${alimento.id}`}
                        variant="destructive"
                        size="sm"
                        onClick={() => onExcluir(alimento.id)}
                      >
                        Excluir
                      </Button>
                    </div>
                  </CardContent>
                </Collapsible>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
