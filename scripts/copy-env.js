const fs = require('fs');
const path = require('path');

// Caminho do arquivo .env
const envPath = path.resolve(__dirname, '../.env');
const envDistPath = path.resolve(__dirname, '../dist/.env');

// Verifica se o arquivo .env existe
if (fs.existsSync(envPath)) {
  // Copia o arquivo .env para a pasta dist
  fs.copyFileSync(envPath, envDistPath);
  console.log('✅ Arquivo .env copiado para dist/');
} else {
  console.error('❌ Arquivo .env não encontrado!');
  process.exit(1);
}