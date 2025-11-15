const fs = require('fs');
const path = require('path');

const srcPublic = path.resolve(__dirname, '../dist/public');
const dstPublic = path.resolve(__dirname, '../../Área de Trabalho/Controle de Estoque-win32-x64/resources/app/dist/public');

// Verifica se o diretório dist/public existe
if (fs.existsSync(srcPublic)) {
  // Cria o diretório dist/public no pacote
  if (!fs.existsSync(dstPublic)) {
    fs.mkdirSync(dstPublic, { recursive: true });
  }

  // Copia todo o conteúdo de dist/public para o pacote
  fs.cpSync(srcPublic, dstPublic, { recursive: true });
  console.log('✅ Build do cliente (dist/public) copiado para o pacote em:', dstPublic);
} else {
  console.error('❌ Diretório dist/public não encontrado em:', srcPublic);
  process.exit(1);
}