import archiver from 'archiver';
import JSZip from 'jszip';
import { Writable, Readable } from 'node:stream';
import { writeFile, readFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import * as tar from 'tar';

function archiverToBuffer(
  setup: (archive: archiver.Archiver) => void,
  format: 'zip' | 'tar',
  options?: archiver.ArchiverOptions,
): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const archive = archiver(format, options);
    const chunks: Buffer[] = [];
    const output = new Writable({
      write(chunk, _enc, cb) {
        chunks.push(chunk);
        cb();
      },
    });
    output.on('finish', () => resolve(Buffer.concat(chunks)));
    archive.on('error', reject);
    archive.pipe(output);
    setup(archive);
    archive.finalize();
  });
}

export async function zipToTarGz(zipBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const files: Array<{ name: string; data: Buffer }> = [];

  for (const [name, entry] of Object.entries(zip.files)) {
    if (!entry.dir) {
      const data = await entry.async('nodebuffer');
      files.push({ name, data });
    }
  }

  return archiverToBuffer(
    (archive) => {
      for (const f of files) {
        archive.append(Readable.from(f.data), { name: f.name });
      }
    },
    'tar',
    { gzip: true },
  );
}

export async function tarGzToZip(tarGzBuffer: Buffer): Promise<Buffer> {
  const workDir = join(tmpdir(), `file-conversor-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const tarGzPath = join(workDir, 'input.tar.gz');
  await writeFile(tarGzPath, tarGzBuffer);

  try {
    await tar.extract({ file: tarGzPath, cwd: workDir, strip: 0 });

    const zip = new JSZip();

    async function addDirToZip(dir: string, prefix: string): Promise<void> {
      const { readdir, stat } = await import('node:fs/promises');
      const entries = await readdir(dir);
      for (const entry of entries) {
        if (entry === 'input.tar.gz') continue;
        const fullPath = join(dir, entry);
        const info = await stat(fullPath);
        if (info.isDirectory()) {
          await addDirToZip(fullPath, prefix ? `${prefix}/${entry}` : entry);
        } else {
          const data = await readFile(fullPath);
          zip.file(prefix ? `${prefix}/${entry}` : entry, data);
        }
      }
    }

    await addDirToZip(workDir, '');

    return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
