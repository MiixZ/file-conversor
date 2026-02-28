import type { APIRoute } from 'astro';
import { processPdf, type PdfAction } from '../../lib/converters/pdf';

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const VALID_ACTIONS: PdfAction[] = ['remove-password', 'add-password'];

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
  const action = formData.get('action') as string | null;

  if (!(fileEntry instanceof File)) {
    return new Response(JSON.stringify({ error: 'No file provided.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!action || !VALID_ACTIONS.includes(action as PdfAction)) {
    return new Response(
      JSON.stringify({ error: `Invalid action. Must be one of: ${VALID_ACTIONS.join(', ')}` }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (fileEntry.size > MAX_FILE_SIZE) {
    return new Response(JSON.stringify({ error: 'File exceeds the 50 MB size limit.' }), {
      status: 413,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const sourceExt = fileEntry.name.split('.').pop()?.toLowerCase() ?? '';
  if (sourceExt !== 'pdf') {
    return new Response(JSON.stringify({ error: 'Only PDF files are supported.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const originalName = sanitizeFilename(fileEntry.name);
  const baseName = baseNameWithout(originalName);
  const inputBuffer = Buffer.from(await fileEntry.arrayBuffer());

  try {
    const password = (formData.get('password') as string) ?? undefined;
    const newPassword = (formData.get('newPassword') as string) ?? undefined;
    const ownerPassword = (formData.get('ownerPassword') as string) ?? undefined;

    const outBuffer = await processPdf(inputBuffer, {
      action: action as PdfAction,
      password,
      newPassword,
      ownerPassword,
    });

    return new Response(outBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${baseName}.pdf"`,
        'Content-Length': String(outBuffer.length),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[pdf] error:', message);
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
