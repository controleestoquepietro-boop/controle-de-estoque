import { supabase } from './supabaseClient';

// 🔹 Produtos
export const ProdutoService = {
  async listar() {
    const { data, error } = await supabase.from('produtos').select('*').order('criado_em', { ascending: false });
    if (error) throw error;
    return data;
  },

  async adicionar(produto: any) {
    const { data, error } = await supabase.from('produtos').insert([produto]).select();
    if (error) throw error;
    return data[0];
  },

  async atualizar(id: string, produto: any) {
    const { data, error } = await supabase.from('produtos').update(produto).eq('id', id).select();
    if (error) throw error;
    return data[0];
  },

  async deletar(id: string) {
    const { error } = await supabase.from('produtos').delete().eq('id', id);
    if (error) throw error;
  },
};

// 🔹 Movimentações
export const MovimentacaoService = {
  async listar() {
    const { data, error } = await supabase
      .from('movimentacoes')
      .select('*, produtos(nome)')
      .order('criado_em', { ascending: false });
    if (error) throw error;
    return data;
  },

  async registrar(movimentacao: any) {
    const { data, error } = await supabase.from('movimentacoes').insert([movimentacao]).select();
    if (error) throw error;
    return data[0];
  },
};
