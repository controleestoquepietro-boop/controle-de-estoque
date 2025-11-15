import { storage } from '../storage';
import { supabase } from '../supabaseClient';

async function main() {
  console.log('Iniciando sincronização de alimentos locais -> Supabase');
  const alimentos = await storage.getAllAlimentos();
  console.log(`Encontrados ${alimentos.length} alimentos locais`);

  let success = 0;
  let failed = 0;

  for (const a of alimentos) {
    try {
      const payload = {
        nome: a.nome,
        codigo_produto: (a as any).codigoProduto,
        temperatura: a.temperatura,
        quantidade: a.quantidade,
        unidade: a.unidade,
        lote: a.lote,
        data_fabricacao: (a as any).dataFabricacao,
        data_validade: (a as any).dataValidade,
        data_entrada: a.dataEntrada,
        data_saida: a.dataSaida || null,
        categoria: a.categoria || null,
        cadastrado_por: a.cadastradoPor || null,
        shelf_life: a.shelfLife || null,
        peso_por_caixa: a.pesoPorCaixa || null,
        alertas_config: (a as any).alertasConfig || {
          contarAPartirFabricacaoDias: 3,
          avisoQuandoUmTercoValidade: true,
          popUpNotificacoes: true,
        },
      };

      const { data, error } = await supabase
        .from('alimentos')
        .upsert([payload], { onConflict: 'codigo_produto' })
        .select();

      if (error) {
        console.error('Erro ao upsert alimento', (a as any).id, (a as any).codigoProduto, error);
        failed++;
      } else {
        success++;
      }
    } catch (e) {
      console.error('Exceção sincronizando alimento', (a as any).id, e);
      failed++;
    }
  }

  console.log(`Sincronização finalizada. Sucesso: ${success}, Falhas: ${failed}`);
}

if (require.main === module) {
  main().catch((e) => {
    console.error('Erro no sync script:', e);
    process.exit(1);
  });
}
