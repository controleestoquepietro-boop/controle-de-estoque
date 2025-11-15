#!/usr/bin/env node

/**
 * Script para gerar ícones PWA a partir do favicon.png
 * Requer: npm install sharp
 */

const sharp = require('sharp');
const path = require('path');
const fs = require('fs');

const faviconPath = path.join(__dirname, '..', 'client', 'public', 'favicon.png');
const outputDir = path.join(__dirname, '..', 'client', 'public');

// Dimensões necessárias para PWA
const sizes = [192, 512];

async function generateIcons() {
  try {
    // Verificar se o favicon existe
    if (!fs.existsSync(faviconPath)) {
      console.error(`❌ Erro: Arquivo não encontrado: ${faviconPath}`);
      process.exit(1);
    }

    console.log(`✓ Favicon carregado: ${faviconPath}`);

    // Gerar ícones para cada tamanho
    for (const size of sizes) {
      // Ícone padrão
      await sharp(faviconPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, `icon-${size}.png`));
      console.log(`✓ Criado: icon-${size}.png`);

      // Ícone maskable (com espaço ao redor)
      const innerSize = Math.floor(size * 0.8);
      const offset = (size - innerSize) / 2;

      await sharp(faviconPath)
        .resize(innerSize, innerSize, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .extend({
          top: Math.floor(offset),
          bottom: Math.floor(offset),
          left: Math.floor(offset),
          right: Math.ceil(offset),
          background: { r: 255, g: 255, b: 255, alpha: 0 }
        })
        .png()
        .toFile(path.join(outputDir, `icon-maskable-${size}.png`));
      console.log(`✓ Criado: icon-maskable-${size}.png`);
    }

    console.log('\n✅ Ícones PWA gerados com sucesso!');
    console.log('\nOs seguintes ícones foram criados em client/public/:');
    for (const size of sizes) {
      console.log(`  - icon-${size}.png`);
      console.log(`  - icon-maskable-${size}.png`);
    }

  } catch (error) {
    console.error(`❌ Erro ao gerar ícones: ${error.message}`);
    process.exit(1);
  }
}

generateIcons();
