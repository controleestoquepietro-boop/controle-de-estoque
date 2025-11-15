import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { useToast } from '../hooks/use-toast';

interface Produto {
  id: number;
  codigo_produto: string;
  descricao: string;
  temperatura: string;
  shelf_life: number;
  gtin?: string;
  empresa?: string;
}

export default function Produtos() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [novoProduto, setNovoProduto] = useState<Partial<Produto>>({});
  const { toast } = useToast();

  // Buscar produtos do Supabase
  const fetchProdutos = async () => {
    const { data, error } = await supabase.from('modelos_produtos').select('*');
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      setProdutos(data);
    }
  };

  // Inserir novo produto
  const handleAddProduto = async () => {
    if (!novoProduto.codigo_produto || !novoProduto.descricao) {
      toast({ title: 'Aviso', description: 'Preencha código e descrição', variant: 'destructive' });
      return;
    }

    const { error } = await supabase.from('modelos_produtos').insert([novoProduto]);
    if (error) {
      toast({ title: 'Erro', description: error.message, variant: 'destructive' });
    } else {
      toast({ title: 'Sucesso', description: 'Produto adicionado com sucesso!' });
      setNovoProduto({});
      fetchProdutos();
    }
  };

  useEffect(() => {
    fetchProdutos();
  }, []);

  return (
    <div className="min-h-screen p-8 bg-background">
      <Card className="max-w-3xl mx-auto">
        <CardHeader>
          <CardTitle>Gerenciar Produtos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <Input
              placeholder="Código do produto"
              value={novoProduto.codigo_produto || ''}
              onChange={(e) => setNovoProduto({ ...novoProduto, codigo_produto: e.target.value })}
            />
            <Input
              placeholder="Descrição"
              value={novoProduto.descricao || ''}
              onChange={(e) => setNovoProduto({ ...novoProduto, descricao: e.target.value })}
            />
            <Input
              placeholder="Temperatura"
              value={novoProduto.temperatura || ''}
              onChange={(e) => setNovoProduto({ ...novoProduto, temperatura: e.target.value })}
            />
            <Input
              type="number"
              placeholder="Shelf life (dias)"
              value={novoProduto.shelf_life || ''}
              onChange={(e) => setNovoProduto({ ...novoProduto, shelf_life: Number(e.target.value) })}
            />
          </div>

          <Button onClick={handleAddProduto} className="w-full">Adicionar Produto</Button>

          <div className="mt-8">
            <h2 className="text-lg font-semibold mb-2">Lista de Produtos</h2>
            <ul className="divide-y divide-border">
              {produtos.map((p) => (
                <li key={p.id} className="py-2 flex justify-between">
                  <span>{p.descricao}</span>
                  <span className="text-muted-foreground">{p.codigo_produto}</span>
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
