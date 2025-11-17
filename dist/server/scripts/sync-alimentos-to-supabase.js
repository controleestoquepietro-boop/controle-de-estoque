"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const storage_1 = require("../storage");
const supabaseClient_1 = require("../supabaseClient");
async function main() {
    console.log('Iniciando sincronização de alimentos locais -> Supabase');
    const alimentos = await storage_1.storage.getAllAlimentos();
    console.log(`Encontrados ${alimentos.length} alimentos locais`);
    let success = 0;
    let failed = 0;
    for (const a of alimentos) {
        try {
            const payload = {
                nome: a.nome,
                codigo_produto: a.codigoProduto,
                temperatura: a.temperatura,
                quantidade: a.quantidade,
                unidade: a.unidade,
                lote: a.lote,
                data_fabricacao: a.dataFabricacao,
                data_validade: a.dataValidade,
                data_entrada: a.dataEntrada,
                data_saida: a.dataSaida || null,
                categoria: a.categoria || null,
                cadastrado_por: a.cadastradoPor || null,
                shelf_life: a.shelfLife || null,
                peso_por_caixa: a.pesoPorCaixa || null,
                alertas_config: a.alertasConfig || {
                    contarAPartirFabricacaoDias: 3,
                    avisoQuandoUmTercoValidade: true,
                    popUpNotificacoes: true,
                },
            };
            const { data, error } = await supabaseClient_1.supabase
                .from('alimentos')
                .upsert([payload], { onConflict: 'codigo_produto' })
                .select();
            if (error) {
                console.error('Erro ao upsert alimento', a.id, a.codigoProduto, error);
                failed++;
            }
            else {
                success++;
            }
        }
        catch (e) {
            console.error('Exceção sincronizando alimento', a.id, e);
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
