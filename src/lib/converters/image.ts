import sharp from 'sharp';

export type ImageFormat = 'jpeg' | 'jpg' | 'png' | 'webp' | 'avif' | 'gif' | 'tiff' | 'bmp';

const FORMAT_ALIASES: Record<string, ImageFormat> = {
  jpg: 'jpeg',
};

export function normalizeFormat(fmt: string): ImageFormat {
  const lower = fmt.toLowerCase() as ImageFormat;
  return FORMAT_ALIASES[lower] ?? lower;
}

export async function convertImage(
  inputBuffer: Buffer,
  targetFormat: ImageFormat,
): Promise<Buffer> {
  const fmt = normalizeFormat(targetFormat);
  const instance = sharp(inputBuffer);

  switch (fmt) {
    case 'jpeg':
      return instance.jpeg({ quality: 90 }).toBuffer();
    case 'png':
      return instance.png().toBuffer();
    case 'webp':
      return instance.webp({ quality: 90 }).toBuffer();
    case 'avif':
      return instance.avif({ quality: 75 }).toBuffer();
    case 'gif':
      return instance.gif().toBuffer();
    case 'tiff':
      return instance.tiff().toBuffer();
    case 'bmp':
      // Sharp does not support BMP as an output format; the closest
      // visual equivalent is PNG (lossless). This is a known limitation.
      return instance.png().toBuffer();
    default:
      throw new Error(`Unsupported target image format: ${targetFormat}`);
  }
}

export function imageMimeType(format: ImageFormat): string {
  const map: Record<ImageFormat, string> = {
    jpeg: 'image/jpeg',
    jpg: 'image/jpeg',
    png: 'image/png',
    webp: 'image/webp',
    avif: 'image/avif',
    gif: 'image/gif',
    tiff: 'image/tiff',
    bmp: 'image/bmp',
  };
  return map[format] ?? 'application/octet-stream';
}
