import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { supabase } from '@/lib/supabaseClient';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { LogOut, Plus, Download, Upload, History, ChevronDown, FileStack } from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { AlimentoList } from '@/components/alimento-list';
import { AlimentoForm } from '@/components/alimento-form';
import { SaidaDialog } from '@/components/saida-dialog';
import { ImportExcelDialog } from '@/components/import-excel-dialog';
import { ImportModelosDialog } from '@/components/import-modelos-dialog';
import { AuditLogDialog } from '@/components/audit-log-dialog';
import { NotificationsPanel } from '@/components/notifications-panel';
import type { User, Alimento, AlimentoComputado, InsertAlimento } from '@shared/schema';
import { calcularCamposComputados } from '@/lib/alimento-utils';
import * as XLSX from 'xlsx';
import logoPrieto from '@assets/LOGO-PRIETO_1761688931089.png';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { AlertCircle } from 'lucide-react';

function ErrorAlert({ message }: { message: string }) {
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Erro</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}

export default function Dashboard() {
  console.log('Dashboard: Iniciando renderização'); // Debug log

  // usar navegação via hash para compatibilidade com SimpleHashRouter
  const setLocation = (to: string) => {
    if (!to.startsWith('#')) to = `#${to}`;
    window.location.hash = to;
  };

  const { toast } = useToast();
  const [formOpen, setFormOpen] = useState(false);
  const [saidaDialogOpen, setSaidaDialogOpen] = useState(false);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importModelosOpen, setImportModelosOpen] = useState(false);
  const [auditLogOpen, setAuditLogOpen] = useState(false);
  const [editando, setEditando] = useState<Alimento | undefined>();
  const [alimentoParaSaida, setAlimentoParaSaida] = useState<AlimentoComputado | null>(null);
  const [fileActionsOpen, setFileActionsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Buscar usuário atual
  const { data: user, isLoading: userLoading, error: userError } = useQuery<User>(({ queryKey: ['auth/user'], queryFn: async () => {
      try {
        console.log('Dashboard: Buscando usuário...'); // Debug log
        const authRes = await supabase.auth.getUser();
        const authUser = authRes.data?.user || null;
        console.log('Dashboard: Dados do auth user:', authUser); // Debug log

        if (authRes.error) {
          console.error('Erro ao buscar auth user:', authRes.error);
          setError(authRes.error.message);
          throw authRes.error;
        }

        if (!authUser) {
          console.error('Usuário não encontrado');
          setError('Usuário não encontrado');
          throw new Error('Usuário não encontrado');
        }

        // Tentar preencher o `nome` a partir da tabela `users` (caso o campo
        // não esteja presente em user.user_metadata). Isso resolve casos em
        // que o Supabase Auth não contém o perfil completo.
        let fullUser: any = authUser;
        try {
          const { data: profile, error: profileError } = await supabase
            .from('users')
            .select('*')
            .eq('id', authUser.id)
            .maybeSingle();

          if (profileError) {
            console.warn('Não foi possível buscar perfil na tabela users:', profileError);
          } else if (profile) {
            // mesclar perfil da tabela 'users' (contém 'nome') com o auth user
            fullUser = { ...authUser, ...profile };
          } else if (authUser.user_metadata && (authUser.user_metadata.nome || authUser.user_metadata.full_name)) {
            // fallback: usar nome em user_metadata se existir
            fullUser = { ...authUser, nome: authUser.user_metadata.nome || authUser.user_metadata.full_name };
          }
        } catch (e) {
          console.warn('Falha ao buscar perfil de usuário (não crítico):', e);
        }

        return fullUser;
      } catch (error: any) {
        console.error('Erro na query de usuário:', error);
        setError(error.message);
        throw error;
      }
    },
    } as any));

  // Buscar alimentos somente se o usuário estiver carregado
  const { data: alimentos = [], isLoading: alimentosLoading } = useQuery<Alimento[]>({
    queryKey: ['alimentos'],
    queryFn: async () => {
      try {
        console.log('Dashboard: Buscando alimentos via API...'); // Debug log
        // Chamar via API do servidor (que retorna dados já processados)
        const data = await apiRequest('GET', '/api/alimentos');
        
        console.log('Dashboard: Alimentos recebidos via API:', data); // Debug log
        
        if (!data) return [];
        
        // Garantir que as datas estão no formato correto
        return data.map((alimento: any) => ({
          ...alimento,
          dataFabricacao: alimento.dataFabricacao ? new Date(alimento.dataFabricacao).toISOString().split('T')[0] : null,
          dataValidade: alimento.dataValidade ? new Date(alimento.dataValidade).toISOString().split('T')[0] : null
        }));
      } catch (error) {
        console.error('Erro ao processar alimentos:', error);
        throw error;
      }
    },
    enabled: !!user // Só busca alimentos se tiver usuário
  });

  // Estado de carregamento geral
  const isLoading = userLoading || alimentosLoading;

  // Renderizar erro se houver
  if (error) {
    console.error('Renderizando erro:', error);
    return (
      <div className="container mx-auto p-4">
        <ErrorAlert message={error} />
        <Button 
          onClick={() => {
            setError(null);
            window.location.hash = '#/login';
          }}
          variant="outline"
        >
          Voltar para login
        </Button>
      </div>
    );
  }

  // Buscar audit logs via API do servidor para garantir consistência
  const { data: auditLogs = [] } = useQuery<any[]>({
    queryKey: ['audit-log'],
    queryFn: async () => {
      console.log('Dashboard: Buscando audit logs via API...'); // Debug log
      const data = await apiRequest('GET', '/api/audit-log');
      console.log('Dashboard: Audit logs recebidos via API:', data);
      return data || [];
    }
  });

  // Mutation de logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      console.log('Dashboard: Fazendo logout...'); // Debug log
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    },
    onSuccess: () => {
      console.log('Dashboard: Logout bem sucedido'); // Debug log
      queryClient.clear();
      window.location.hash = '#/login';
      toast({ title: 'Sucesso', description: 'Logout realizado com sucesso' });
    },
  });

  // Mutation para criar alimento
  const createMutation = useMutation({
    mutationFn: async (data: InsertAlimento) => {
      return await apiRequest('POST', '/api/alimentos', data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alimentos'] });
      // garantir que o histórico seja recarregado para mostrar quem cadastrou
      queryClient.invalidateQueries({ queryKey: ['audit-log'] });
      toast({ title: 'Sucesso', description: 'Alimento cadastrado com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao cadastrar alimento',
        variant: 'destructive',
      });
    },
  });

  // Mutation para atualizar alimento
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: InsertAlimento }) => {
      return await apiRequest('PATCH', `/api/alimentos/${id}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alimentos'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log'] });
      toast({ title: 'Sucesso', description: 'Alimento atualizado com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao atualizar alimento',
        variant: 'destructive',
      });
    },
  });

  // Mutation para deletar alimento
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      return await apiRequest('DELETE', `/api/alimentos/${id}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alimentos'] });
      // remover da lista de histórico sem precisar recarregar a página
      queryClient.invalidateQueries({ queryKey: ['audit-log'] });
      toast({ title: 'Sucesso', description: 'Alimento excluído com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao excluir alimento',
        variant: 'destructive',
      });
    },
  });

  // Mutation para registrar saída
  const saidaMutation = useMutation({
    mutationFn: async ({ id, quantidade }: { id: number; quantidade: number }) => {
      return await apiRequest('POST', `/api/alimentos/${id}/saida`, { quantidade });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alimentos'] });
      queryClient.invalidateQueries({ queryKey: ['audit-log'] });
      toast({ title: 'Sucesso', description: 'Saída registrada com sucesso!' });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro',
        description: error.message || 'Erro ao registrar saída',
        variant: 'destructive',
      });
    },
  });

  // Computar campos adicionais
  const alimentosComputados: AlimentoComputado[] = alimentos
    .map(calcularCamposComputados)
    .sort((a, b) => new Date((b as any).createdAt).getTime() - new Date((a as any).createdAt).getTime());

  const handleNovo = () => {
    setEditando(undefined);
    setFormOpen(true);
  };

  const handleEditar = (alimento: AlimentoComputado) => {
    setEditando(alimento);
    setFormOpen(true);
  };

  const handleSubmit = (data: InsertAlimento) => {
    if (editando) {
      updateMutation.mutate({ id: editando.id, data });
    } else {
      createMutation.mutate(data);
    }
    setFormOpen(false);
    setEditando(undefined);
  };

  const handleExcluir = (id: number) => {
    if (confirm('Tem certeza que deseja excluir este alimento?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleRegistrarSaida = (id: number) => {
    const alimento = alimentosComputados.find((a) => a.id === id);
    if (alimento) {
      setAlimentoParaSaida(alimento);
      setSaidaDialogOpen(true);
    }
  };

  const handleConfirmarSaida = (quantidade: number) => {
    if (!alimentoParaSaida) return;
    saidaMutation.mutate({ id: alimentoParaSaida.id, quantidade });
    setSaidaDialogOpen(false);
    setAlimentoParaSaida(null);
  };

  const handleLogout = () => {
    logoutMutation.mutate();
  };

  // Exportar para Excel - incluindo histórico completo
  const handleExportExcel = () => {
    // Aba 1: Estoque atual
    const dataEstoqueAtual = alimentosComputados.map((a) => ({
      'Código Produto': a.codigoProduto,
      'Nome': a.nome,
      'Unidade': a.unidade,
      'Lote': a.lote,
      'Data Fabricação': a.dataFabricacao,
      'Data Validade': a.dataValidade,
      'Quantidade': a.quantidade,
      'Peso por Caixa (kg)': a.pesoPorCaixa || '',
      'Peso Total (kg)': a.pesoTotal.toFixed(2),
      'Temperatura': a.temperatura,
      'Shelf Life (dias)': a.shelfLife,
      'Data Entrada': a.dataEntrada,
      'Data Saída': a.dataSaida || '',
      'Status': a.status,
      'Dias Restantes': a.diasRestantes,
    }));

    // Aba 2: Histórico completo (incluindo exclusões)
    const dataHistorico = auditLogs.map((log: any) => ({
      'ID': log.id,
      'Ação': log.action === 'CREATE' ? 'Cadastro' : 
              log.action === 'UPDATE' ? 'Edição' : 
              log.action === 'DELETE' ? 'Exclusão' : 
              log.action === 'SAIDA' ? 'Saída' : log.action,
      'Código Produto': log.alimentoCodigo || '',
      'Nome Produto': log.alimentoNome || '',
      'Usuário': log.userName,
      'Data/Hora': new Date(log.timestamp).toLocaleString('pt-BR'),
      'Status': log.action === 'DELETE' ? 'EXCLUÍDO' : 
                log.action === 'SAIDA' ? 'SAÍDA REGISTRADA' : 
                log.action === 'UPDATE' ? 'ALTERADO' : 'CADASTRADO',
    }));

    // Criar workbook
    const wb = XLSX.utils.book_new();
    
    // Adicionar aba de estoque atual
    const wsEstoque = XLSX.utils.json_to_sheet(dataEstoqueAtual);
    XLSX.utils.book_append_sheet(wb, wsEstoque, 'Estoque Atual');
    
    // Adicionar aba de histórico
    const wsHistorico = XLSX.utils.json_to_sheet(dataHistorico);
    XLSX.utils.book_append_sheet(wb, wsHistorico, 'Histórico Completo');
    
    // Salvar arquivo
    const dataAtual = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `estoque-completo-${dataAtual}.xlsx`);
    
    toast({ 
      title: 'Sucesso', 
      description: `Exportado ${dataEstoqueAtual.length} produtos ativos e ${dataHistorico.length} registros históricos!` 
    });
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-3">
              <img 
                src={logoPrieto} 
                alt="Prieto" 
                className="h-10 w-auto"
                data-testid="img-logo"
              />
              <div>
                <h1 className="text-xl font-bold text-foreground">Controle de Alimentos</h1>
                <p className="text-sm text-muted-foreground">
                  Gerenciado por <strong>{user?.nome}</strong>
                </p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap items-center relative">
              <Collapsible open={fileActionsOpen} onOpenChange={setFileActionsOpen}>
                <CollapsibleTrigger asChild>
                  <Button
                    data-testid="button-toggle-file-actions"
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    <FileStack className="h-4 w-4" />
                    Gerenciar Arquivos
                    <ChevronDown className={`h-4 w-4 transition-transform ${fileActionsOpen ? 'rotate-180' : ''}`} />
                  </Button>
                </CollapsibleTrigger>
        {/* Forçamos o menu a aparecer logo abaixo do botão usando `top-full` para evitar
          artefatos visuais (linha branca) que apareciam quando o conteúdo ficava
          muito próximo ao bordo do header. */}
        {fileActionsOpen && (
          <CollapsibleContent className="absolute right-0 top-full translate-y-2 bg-card border rounded-md shadow-lg p-2 z-10 flex flex-col gap-2 min-w-[200px]">
                  <Button
                    data-testid="button-import-modelos"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImportModelosOpen(true);
                      setFileActionsOpen(false);
                    }}
                    className="gap-2 justify-start"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Modelos
                  </Button>
                  <Button
                    data-testid="button-import-excel"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setImportDialogOpen(true);
                      setFileActionsOpen(false);
                    }}
                    className="gap-2 justify-start"
                  >
                    <Upload className="h-4 w-4" />
                    Importar Alimentos
                  </Button>
                  <Button
                    data-testid="button-view-history"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setAuditLogOpen(true);
                      setFileActionsOpen(false);
                    }}
                    className="gap-2 justify-start"
                  >
                    <History className="h-4 w-4" />
                    Histórico
                  </Button>
                  <Button
                    data-testid="button-export-excel"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      handleExportExcel();
                      setFileActionsOpen(false);
                    }}
                    className="gap-2 justify-start"
                  >
                    <Download className="h-4 w-4" />
                    Exportar
                  </Button>
                </CollapsibleContent>
          )}

              </Collapsible>
              <Button
                data-testid="button-logout"
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2"
              >
                <LogOut className="h-4 w-4" />
                Sair
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {isLoading ? (
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Carregando...</p>
            </div>
          </div>
        ) : (
          <AlimentoList
            alimentos={alimentosComputados}
            auditLogs={auditLogs}
            onNovo={handleNovo}
            onEditar={handleEditar}
            onExcluir={handleExcluir}
            onRegistrarSaida={handleRegistrarSaida}
          />
        )}
      </div>

      <AlimentoForm
        open={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditando(undefined);
        }}
        onSubmit={handleSubmit}
        initialData={editando}
      />

      <SaidaDialog
        open={saidaDialogOpen}
        onClose={() => {
          setSaidaDialogOpen(false);
          setAlimentoParaSaida(null);
        }}
        onConfirm={handleConfirmarSaida}
        alimento={alimentoParaSaida}
      />

      <ImportExcelDialog
        open={importDialogOpen}
        onClose={() => setImportDialogOpen(false)}
      />

      <ImportModelosDialog
        open={importModelosOpen}
        onClose={() => setImportModelosOpen(false)}
      />

      <AuditLogDialog
        open={auditLogOpen}
        onClose={() => setAuditLogOpen(false)}
      />

      <NotificationsPanel alimentos={alimentosComputados} />
    </div>
  );
}
