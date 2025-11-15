const fs = require('fs');
const path = require('path');

const srcEnv = path.resolve(__dirname, '../.env');
const dstEnv = path.resolve(__dirname, '../../Área de Trabalho/Controle de Estoque-win32-x64/resources/app/.env');

// Verifica se o arquivo .env existe
if (fs.existsSync(srcEnv)) {
  // Cria o diretório se não existir
  const dstDir = path.dirname(dstEnv);
  if (!fs.existsSync(dstDir)) {
    fs.mkdirSync(dstDir, { recursive: true });
  }

  // Copia o arquivo .env para o pacote
  fs.copyFileSync(srcEnv, dstEnv);
  console.log('✅ Arquivo .env copiado para o pacote em:', dstEnv);
} else {
  console.error('❌ Arquivo .env não encontrado em:', srcEnv);
  process.exit(1);
}