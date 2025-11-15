import { promises as fs } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import toIco from 'png-to-ico';
import sharp from 'sharp';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const rootDir = dirname(__dirname);

async function resizeImage(inputPath) {
  const tempPath = join(rootDir, 'temp_icon.png');
  await sharp(inputPath)
    .resize(256, 256)
    .toFile(tempPath);
  return tempPath;
}

async function generateIcon() {
  try {
    const iconPath = join(rootDir, 'attached_assets', 'image_1761738051631.png');
    const outputPath = join(rootDir, 'client', 'public');
    
    console.log('Input path:', iconPath);
    console.log('Output path:', outputPath);
    
    // Ensure the output directory exists
    await fs.mkdir(outputPath, { recursive: true });
    
    // Resize image to square
    const resizedImagePath = await resizeImage(iconPath);
    
    // Convert PNG to ICO
    const iconData = await fs.readFile(resizedImagePath);
    const icoBuffer = await toIco(iconData);
    
    // Save the ICO file
    await fs.writeFile(join(outputPath, 'favicon.ico'), icoBuffer);
    
    // Clean up temporary file
    await fs.unlink(resizedImagePath);
    
    console.log('Icon generated successfully!');
  } catch (error) {
    console.error('Error generating icon:', error);
    process.exit(1);
  }
}

generateIcon();