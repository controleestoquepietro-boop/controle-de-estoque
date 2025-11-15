const fs = require('fs');
const path = require('path');
const pngToIco = require('png-to-ico');

async function generate() {
  const src = path.join(__dirname, '..', 'client', 'public', 'favicon.png');
  const outDir = path.join(__dirname, '..', 'build');
  const out = path.join(outDir, 'icon.ico');

  if (!fs.existsSync(src)) {
    console.error('favicon.png não encontrado em client/public. Procure por client/public/favicon.png');
    process.exit(1);
  }

  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

  try {
    const buf = await pngToIco(src);
    fs.writeFileSync(out, buf);
    console.log('Ícone gerado em', out);
  } catch (err) {
    console.error('Erro ao gerar ícone:', err);
    process.exit(1);
  }
}

generate();
