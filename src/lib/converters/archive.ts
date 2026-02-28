import JSZip from "jszip";
import { writeFile, readFile, rm, mkdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { randomUUID } from "node:crypto";
import * as tar from "tar";

export async function zipToTarGz(zipBuffer: Buffer): Promise<Buffer> {
  const zip = await JSZip.loadAsync(zipBuffer);
  const workDir = join(tmpdir(), `file-conversor-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  try {
    const fileNames: string[] = [];

    for (const [name, entry] of Object.entries(zip.files)) {
      if (!entry.dir) {
        const data = await entry.async("nodebuffer");
        const filePath = join(workDir, name);
        await mkdir(dirname(filePath), { recursive: true });
        await writeFile(filePath, data);
        fileNames.push(name);
      }
    }

    const outputPath = join(tmpdir(), `file-conversor-${randomUUID()}.tar.gz`);
    await tar.create({ gzip: true, cwd: workDir, file: outputPath }, fileNames);

    try {
      return await readFile(outputPath);
    } finally {
      await rm(outputPath, { force: true });
    }
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}

export async function tarGzToZip(tarGzBuffer: Buffer): Promise<Buffer> {
  const workDir = join(tmpdir(), `file-conversor-${randomUUID()}`);
  await mkdir(workDir, { recursive: true });

  const tarGzPath = join(workDir, "input.tar.gz");
  await writeFile(tarGzPath, tarGzBuffer);

  try {
    await tar.extract({ file: tarGzPath, cwd: workDir, strip: 0 });

    const zip = new JSZip();

    async function addDirToZip(dir: string, prefix: string): Promise<void> {
      const { readdir, stat } = await import("node:fs/promises");
      const entries = await readdir(dir);
      for (const entry of entries) {
        if (entry === "input.tar.gz") continue;
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

    await addDirToZip(workDir, "");

    return zip.generateAsync({ type: "nodebuffer", compression: "DEFLATE" });
  } finally {
    await rm(workDir, { recursive: true, force: true });
  }
}
