import { AlimentoComputado } from '@/types/alimento';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Search, ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo, useState } from 'react';
import { getStatusColor } from '@/lib/alimentoUtils';
import logo from '@/assets/logo-prieto.png';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

interface AlimentoListProps {
  alimentos: AlimentoComputado[];
  onNovo: () => void;
  onEditar: (alimento: AlimentoComputado) => void;
  onExcluir: (codigo: number) => void;
  onRegistrarSaida: (codigo: number) => void;
}

export function AlimentoList({ alimentos, onNovo, onEditar, onExcluir, onRegistrarSaida }: AlimentoListProps) {
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<string>('todos');
  const [expandedItems, setExpandedItems] = useState<Set<number>>(new Set());

  const toggleExpanded = (codigo: number) => {
    setExpandedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(codigo)) {
        newSet.delete(codigo);
      } else {
        newSet.add(codigo);
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
        (filtroStatus === 'vencido' && alimento.status === 'VENCIDO');

      return matchBusca && matchStatus;
    });
  }, [alimentos, busca, filtroStatus]);

  const estatisticas = useMemo(() => {
    return {
      total: alimentos.length,
      vencidos: alimentos.filter((m) => m.status === 'VENCIDO').length,
      vencemBreve: alimentos.filter((m) => m.status === 'VENCE EM BREVE').length,
      ativos: alimentos.filter((m) => m.status === 'ATIVO').length,
    };
  }, [alimentos]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
      <div className="container mx-auto px-4 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
            <img src={logo} alt="Logo Prieto" className="h-12 sm:h-16 w-auto" />
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Controle de Alimentos</h1>
              <p className="text-sm text-muted-foreground">
                Gerencie o estoque e monitore validades
              </p>
            </div>
          </div>
          <Button onClick={onNovo} size="lg" className="gap-2 w-full md:w-auto">
            Novo Alimento
          </Button>
        </div>

        {/* Estatísticas */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-xl sm:text-2xl font-bold">{estatisticas.total}</div>
              <p className="text-xs text-muted-foreground">Total</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-xl sm:text-2xl font-bold text-success">{estatisticas.ativos}</div>
              <p className="text-xs text-muted-foreground">Ativos</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-xl sm:text-2xl font-bold text-warning">{estatisticas.vencemBreve}</div>
              <p className="text-xs text-muted-foreground">Vence Breve</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4 pb-4">
              <div className="text-xl sm:text-2xl font-bold text-destructive">{estatisticas.vencidos}</div>
              <p className="text-xs text-muted-foreground">Vencidos</p>
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
                  placeholder="Buscar por nome, lote ou código..."
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant={filtroStatus === 'todos' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('todos')}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Todos
                </Button>
                <Button
                  variant={filtroStatus === 'ativo' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('ativo')}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Ativos
                </Button>
                <Button
                  variant={filtroStatus === 'vence' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('vence')}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Vence Breve
                </Button>
                <Button
                  variant={filtroStatus === 'vencido' ? 'default' : 'outline'}
                  onClick={() => setFiltroStatus('vencido')}
                  size="sm"
                  className="flex-1 sm:flex-none"
                >
                  Vencidos
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
              const isExpanded = expandedItems.has(alimento.codigo);
              return (
                <Card key={alimento.codigo} className="overflow-hidden hover:shadow-md transition-shadow">
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpanded(alimento.codigo)}>
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant={getStatusColor(alimento.status) as any} className="text-xs whitespace-nowrap">
                              {alimento.status}
                            </Badge>
                            <span className="text-xs text-muted-foreground">#{alimento.codigo}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-semibold truncate">{alimento.nome}</h3>
                        </div>
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 shrink-0">
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                        <div>
                          <span className="text-xs text-muted-foreground">Código</span>
                          <p className="font-medium">{alimento.codigoProduto}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Lote</span>
                          <p className="font-medium">{alimento.lote}</p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Quantidade</span>
                          <p className="font-medium">
                            {alimento.quantidade} {alimento.unidade}
                          </p>
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground">Dias Restantes</span>
                          <p className="font-medium">{alimento.diasRestantes} dias</p>
                        </div>
                      </div>

                      <CollapsibleContent>
                        <div className="border-t pt-3 mt-3">
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                            <div>
                              <span className="text-xs text-muted-foreground">Temperatura</span>
                              <p className="font-medium">{alimento.temperatura}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Shelf Life</span>
                              <p className="font-medium">{alimento.shelfLife} dias</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Peso Total</span>
                              <p className="font-medium">{alimento.pesoTotal.toFixed(2)} kg</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Departamento</span>
                              <p className="font-medium">{alimento.departamento}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Fabricação</span>
                              <p className="font-medium">{alimento.dataFabricacao}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Validade</span>
                              <p className="font-medium">{alimento.dataValidade}</p>
                            </div>
                            <div>
                              <span className="text-xs text-muted-foreground">Entrada</span>
                              <p className="font-medium">{alimento.dataEntrada}</p>
                            </div>
                            {alimento.dataSaida && (
                              <div>
                                <span className="text-xs text-muted-foreground">Saída</span>
                                <p className="font-medium">{alimento.dataSaida}</p>
                              </div>
                            )}
                            <div>
                              <span className="text-xs text-muted-foreground">Cadastrado por</span>
                              <p className="font-medium">{alimento.cadastradoPor}</p>
                            </div>
                          </div>
                        </div>
                      </CollapsibleContent>

                      <div className="flex flex-col sm:flex-row gap-2 justify-end mt-3">
                        {!alimento.dataSaida && (
                          <Button
                            variant="default"
                            size="sm"
                            onClick={() => onRegistrarSaida(alimento.codigo)}
                            className="w-full sm:w-auto"
                          >
                            Registrar Saída
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onEditar(alimento)}
                          className="w-full sm:w-auto"
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => onExcluir(alimento.codigo)}
                          className="w-full sm:w-auto"
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
    </div>
  );
}
