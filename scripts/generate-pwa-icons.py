#!/usr/bin/env python3
"""
Script para gerar ícones PWA a partir do favicon.png
Requer: pip install Pillow
"""

import os
from PIL import Image

# Caminhos
favicon_path = os.path.join(
    os.path.dirname(__file__),
    '..',
    'client',
    'public',
    'favicon.png'
)

output_dir = os.path.join(
    os.path.dirname(__file__),
    '..',
    'client',
    'public'
)

# Dimensões necessárias para PWA
sizes = [192, 512]

try:
    # Abrir a imagem
    img = Image.open(favicon_path)
    
    # Converter para RGBA se necessário (para suportar transparência)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    
    print(f"✓ Favicon carregado: {favicon_path}")
    print(f"  Tamanho original: {img.size}")
    
    # Gerar ícones para cada tamanho
    for size in sizes:
        # Ícone padrão
        icon = img.resize((size, size), Image.Resampling.LANCZOS)
        icon_path = os.path.join(output_dir, f'icon-{size}.png')
        icon.save(icon_path, 'PNG')
        print(f"✓ Criado: {os.path.basename(icon_path)}")
        
        # Ícone maskable (com espaço ao redor para garantir visibilidade)
        # Criar um fundo branco e colocar a imagem no centro
        maskable = Image.new('RGBA', (size, size), (255, 255, 255, 0))
        
        # Redimensionar a imagem um pouco menor para deixar espaço
        inner_size = int(size * 0.8)
        inner_icon = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        
        # Calcular posição para centralizar
        offset = (size - inner_size) // 2
        maskable.paste(inner_icon, (offset, offset), inner_icon)
        
        maskable_path = os.path.join(output_dir, f'icon-maskable-{size}.png')
        maskable.save(maskable_path, 'PNG')
        print(f"✓ Criado: {os.path.basename(maskable_path)}")
    
    print("\n✅ Ícones PWA gerados com sucesso!")
    print("\nOs seguintes ícones foram criados em client/public/:")
    for size in sizes:
        print(f"  - icon-{size}.png")
        print(f"  - icon-maskable-{size}.png")
    
except FileNotFoundError:
    print(f"❌ Erro: Arquivo não encontrado: {favicon_path}")
    print("Certifique-se de que favicon.png existe em client/public/")
except ImportError:
    print("❌ Erro: Pillow não está instalado")
    print("Instale com: pip install Pillow")
except Exception as e:
    print(f"❌ Erro ao gerar ícones: {e}")
