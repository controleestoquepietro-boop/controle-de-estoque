import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_KEY!
);

async function main() {
  // Inserir um produto de teste
  const { data, error } = await supabase
    .from("produtos")
    .insert([{ nome: "Produto Teste", preco: 10.5, quantidade: 3 }])
    .select();

  if (error) {
    console.error("❌ Erro ao inserir:", error);
  } else {
    console.log("✅ Produto inserido com sucesso!");
    console.log(data);
  }
}

main();
