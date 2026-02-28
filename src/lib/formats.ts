export interface ConversionGroup {
  category: string;
  icon: string;
  description: string;
  formats: Array<{
    from: string[];
    to: string[];
  }>;
}

export const CONVERSION_GROUPS: ConversionGroup[] = [
  {
    category: 'Images',
    icon: '🖼️',
    description: 'Lossless and lossy image format conversion',
    formats: [
      { from: ['JPG', 'JPEG'], to: ['PNG', 'WEBP', 'AVIF', 'GIF', 'TIFF'] },
      { from: ['PNG'], to: ['JPG', 'WEBP', 'AVIF', 'GIF', 'TIFF'] },
      { from: ['WEBP'], to: ['JPG', 'PNG', 'AVIF', 'GIF', 'TIFF'] },
      { from: ['AVIF'], to: ['JPG', 'PNG', 'WEBP'] },
      { from: ['GIF'], to: ['JPG', 'PNG', 'WEBP'] },
      { from: ['TIFF'], to: ['JPG', 'PNG', 'WEBP'] },
      { from: ['BMP'], to: ['JPG', 'PNG', 'WEBP'] },
      { from: ['HEIF', 'HEIC'], to: ['JPG', 'PNG', 'WEBP'] },
    ],
  },
  {
    category: 'Archives',
    icon: '📦',
    description: 'Archive format conversion',
    formats: [
      { from: ['ZIP'], to: ['TAR.GZ'] },
      { from: ['TAR.GZ', 'TGZ'], to: ['ZIP'] },
    ],
  },
  {
    category: 'Documents',
    icon: '📄',
    description: 'Document format conversion',
    formats: [{ from: ['DOCX'], to: ['PDF'] }],
  },
  {
    category: 'PDF Tools',
    icon: '🔒',
    description: 'Add or remove password protection on PDF files',
    formats: [
      { from: ['PDF'], to: ['🔓 Remove Password', '🔐 Add Password'] },
    ],
  },
];

/** Map from source extension to list of available target formats */
export const FORMAT_MAP: Record<string, string[]> = {
  jpg: ['png', 'webp', 'avif', 'gif', 'tiff'],
  jpeg: ['png', 'webp', 'avif', 'gif', 'tiff'],
  png: ['jpg', 'webp', 'avif', 'gif', 'tiff'],
  webp: ['jpg', 'png', 'avif', 'gif', 'tiff'],
  avif: ['jpg', 'png', 'webp'],
  gif: ['jpg', 'png', 'webp'],
  tiff: ['jpg', 'png', 'webp'],
  bmp: ['jpg', 'png', 'webp'],
  heif: ['jpg', 'png', 'webp'],
  heic: ['jpg', 'png', 'webp'],
  zip: ['tar.gz'],
  gz: ['zip'],
  tgz: ['zip'],
  docx: ['pdf'],
};
