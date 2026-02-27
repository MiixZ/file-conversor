import type { APIRoute } from 'astro';
import { convertImage, normalizeFormat, imageMimeType } from '../../lib/converters/image';
import { zipToTarGz, tarGzToZip } from '../../lib/converters/archive';
import { docxToPdf } from '../../lib/converters/document';

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'avif', 'gif', 'tiff', 'bmp', 'heif', 'heic']);
const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

function sanitizeFilename(name: string): string {
  return name.replace(/[^\w.\-]/g, '_').replace(/\.{2,}/g, '.');
}

function baseNameWithout(filename: string): string {
  const dot = filename.lastIndexOf('.');
  return dot > 0 ? filename.slice(0, dot) : filename;
}

export const POST: APIRoute = async ({ request }) => {
  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid multipart form data.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const fileEntry = formData.get('file');
  const targetFormat = (formData.get('targetFormat') as string | null)?.toLowerCase().trim();

  if (!(fileEntry instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!targetFormat) {
    return new Response(JSON.stringify({ error: 'No target format provided.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (fileEntry.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: 'File exceeds the 50 MB size limit.' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const originalName = sanitizeFilename(fileEntry.name);
  const sourceExt = originalName.split('.').pop()?.toLowerCase() ?? '';
  const baseName = baseNameWithout(originalName);

  const inputBuffer = Buffer.from(await fileEntry.arrayBuffer());

  try {
    // --- Image conversion ---
    if (IMAGE_EXTENSIONS.has(sourceExt) && IMAGE_EXTENSIONS.has(targetFormat)) {
      const normalized = normalizeFormat(targetFormat);
      const outBuffer = await convertImage(inputBuffer, normalized);
      const ext = normalized === 'jpeg' ? 'jpg' : normalized;
      const mime = imageMimeType(normalized);
      return new Response(outBuffer, {
        status: 200,
        headers: {
          'Content-Type': mime,
          'Content-Disposition': `attachment; filename="${baseName}.${ext}"`,
          'Content-Length': String(outBuffer.length),
        },
      });
    }

    // --- Archive: ZIP → TAR.GZ ---
    if (sourceExt === 'zip' && (targetFormat === 'tar.gz' || targetFormat === 'targz')) {
      const outBuffer = await zipToTarGz(inputBuffer);
      return new Response(outBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/gzip',
          'Content-Disposition': `attachment; filename="${baseName}.tar.gz"`,
          'Content-Length': String(outBuffer.length),
        },
      });
    }

    // --- Archive: TAR.GZ → ZIP ---
    if ((sourceExt === 'gz' || sourceExt === 'tgz') && targetFormat === 'zip') {
      const outBuffer = await tarGzToZip(inputBuffer);
      return new Response(outBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/zip',
          'Content-Disposition': `attachment; filename="${baseName}.zip"`,
          'Content-Length': String(outBuffer.length),
        },
      });
    }

    // --- Document: DOCX → PDF ---
    if (sourceExt === 'docx' && targetFormat === 'pdf') {
      const outBuffer = await docxToPdf(inputBuffer);
      return new Response(outBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
          'Content-Length': String(outBuffer.length),
        },
      });
    }

    return new Response(
      JSON.stringify({
        error: `Unsupported conversion: ${sourceExt} → ${targetFormat}`,
      }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[convert] error:', message);
    return new Response(JSON.stringify({ error: `Conversion failed: ${message}` }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
