import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';
import { FORMAT_MAP } from '../lib/formats';

interface FileEntry {
  id: string;
  file: File;
  targetFormat: string;
  status: 'idle' | 'converting' | 'done' | 'error';
  downloadUrl?: string;
  downloadName?: string;
  errorMessage?: string;
  progress?: number;
}

function getSourceExt(filename: string): string {
  const parts = filename.split('.');
  if (parts.length >= 3 && parts[parts.length - 2] === 'tar') {
    return 'tar.gz';
  }
  return parts.pop()?.toLowerCase() ?? '';
}

function getCompatibleFormats(filename: string): string[] {
  const ext = getSourceExt(filename);
  return FORMAT_MAP[ext] ?? [];
}

function humanSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function uid(): string {
  return Math.random().toString(36).slice(2);
}

export default function FileConverter() {
  const [entries, setEntries] = useState<FileEntry[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | File[]) {
    const arr = Array.from(files);
    setEntries((prev) => {
      const newEntries: FileEntry[] = arr
        .filter((f) => getCompatibleFormats(f.name).length > 0)
        .map((f) => {
          const formats = getCompatibleFormats(f.name);
          return {
            id: uid(),
            file: f,
            targetFormat: formats[0],
            status: 'idle',
          };
        });
      return [...prev, ...newEntries];
    });
  }

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      addFiles(e.dataTransfer.files);
    }
  }, []);

  const onDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const onFileInput = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(e.target.files);
      e.target.value = '';
    }
  }, []);

  function setTargetFormat(id: string, format: string) {
    setEntries((prev) =>
      prev.map((e) => (e.id === id ? { ...e, targetFormat: format } : e)),
    );
  }

  function removeEntry(id: string) {
    setEntries((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry?.downloadUrl) URL.revokeObjectURL(entry.downloadUrl);
      return prev.filter((e) => e.id !== id);
    });
  }

  async function convertOne(entry: FileEntry): Promise<void> {
    setEntries((prev) =>
      prev.map((e) => (e.id === entry.id ? { ...e, status: 'converting', errorMessage: undefined } : e)),
    );

    try {
      const formData = new FormData();
      formData.append('file', entry.file);
      formData.append('targetFormat', entry.targetFormat);

      const res = await fetch('/api/convert', { method: 'POST', body: formData });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(json.error ?? res.statusText);
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const downloadName = match ? match[1] : `converted.${entry.targetFormat}`;

      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id
            ? { ...e, status: 'done', downloadUrl, downloadName }
            : e,
        ),
      );
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Conversion failed';
      setEntries((prev) =>
        prev.map((e) =>
          e.id === entry.id ? { ...e, status: 'error', errorMessage: msg } : e,
        ),
      );
    }
  }

  async function convertAll() {
    const idleEntries = entries.filter((e) => e.status === 'idle' || e.status === 'error');
    await Promise.all(idleEntries.map((e) => convertOne(e)));
  }

  function clearAll() {
    entries.forEach((e) => {
      if (e.downloadUrl) URL.revokeObjectURL(e.downloadUrl);
    });
    setEntries([]);
  }

  const hasPending = entries.some((e) => e.status === 'idle' || e.status === 'error');
  const isConverting = entries.some((e) => e.status === 'converting');
  const allDone = entries.length > 0 && entries.every((e) => e.status === 'done');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#7c6af7' : '#2e2e3d'}`,
          borderRadius: '16px',
          padding: '48px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(124, 106, 247, 0.08)' : '#18181f',
          transition: 'all 0.2s ease',
        }}
      >
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>📂</div>
        <p style={{ margin: '0 0 6px', fontSize: '16px', fontWeight: 600, color: '#e8e8f0' }}>
          Drop files here or click to browse
        </p>
        <p style={{ margin: 0, fontSize: '13px', color: '#8888a4' }}>
          Images, archives (ZIP, TAR.GZ) and documents (DOCX)
        </p>
        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: 'none' }}
          onChange={onFileInput}
          accept=".jpg,.jpeg,.png,.webp,.avif,.gif,.tiff,.bmp,.heif,.heic,.zip,.gz,.tgz,.docx"
        />
      </div>

      {/* File List */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {entries.map((entry) => {
            const formats = getCompatibleFormats(entry.file.name);
            const statusColor =
              entry.status === 'done'
                ? '#22c55e'
                : entry.status === 'error'
                  ? '#ef4444'
                  : entry.status === 'converting'
                    ? '#f59e0b'
                    : '#8888a4';

            return (
              <div
                key={entry.id}
                style={{
                  background: '#18181f',
                  border: '1px solid #2e2e3d',
                  borderRadius: '12px',
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                }}
              >
                {/* File info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    style={{
                      margin: 0,
                      fontSize: '14px',
                      fontWeight: 500,
                      color: '#e8e8f0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {entry.file.name}
                  </p>
                  <p style={{ margin: '2px 0 0', fontSize: '12px', color: '#8888a4' }}>
                    {humanSize(entry.file.size)}
                    {entry.status === 'error' && (
                      <span style={{ color: '#ef4444', marginLeft: 8 }}>
                        ⚠ {entry.errorMessage}
                      </span>
                    )}
                  </p>
                </div>

                {/* Format selector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '13px', color: '#8888a4' }}>→</span>
                  <select
                    value={entry.targetFormat}
                    onChange={(e) => setTargetFormat(entry.id, e.target.value)}
                    disabled={entry.status === 'converting' || entry.status === 'done'}
                    style={{
                      background: '#22222d',
                      border: '1px solid #2e2e3d',
                      borderRadius: '8px',
                      color: '#e8e8f0',
                      padding: '6px 10px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    {formats.map((f) => (
                      <option key={f} value={f}>
                        {f.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status badge */}
                <span
                  style={{
                    fontSize: '12px',
                    color: statusColor,
                    minWidth: '70px',
                    textAlign: 'center',
                  }}
                >
                  {entry.status === 'converting' && '⏳ Converting…'}
                  {entry.status === 'done' && '✅ Done'}
                  {entry.status === 'error' && '❌ Error'}
                  {entry.status === 'idle' && '⬜ Ready'}
                </span>

                {/* Actions */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  {entry.status === 'done' && entry.downloadUrl && (
                    <a
                      href={entry.downloadUrl}
                      download={entry.downloadName}
                      style={{
                        background: '#7c6af7',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        textDecoration: 'none',
                        fontWeight: 500,
                      }}
                    >
                      ⬇ Download
                    </a>
                  )}
                  {(entry.status === 'idle' || entry.status === 'error') && (
                    <button
                      onClick={() => convertOne(entry)}
                      style={{
                        background: '#7c6af7',
                        color: '#fff',
                        padding: '6px 14px',
                        borderRadius: '8px',
                        fontSize: '13px',
                        border: 'none',
                        cursor: 'pointer',
                        fontWeight: 500,
                      }}
                    >
                      Convert
                    </button>
                  )}
                  <button
                    onClick={() => removeEntry(entry.id)}
                    title="Remove"
                    style={{
                      background: 'transparent',
                      border: '1px solid #2e2e3d',
                      color: '#8888a4',
                      padding: '6px 10px',
                      borderRadius: '8px',
                      fontSize: '13px',
                      cursor: 'pointer',
                    }}
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Batch actions */}
      {entries.length > 0 && (
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          {hasPending && !isConverting && (
            <button
              onClick={convertAll}
              style={{
                background: '#7c6af7',
                color: '#fff',
                padding: '10px 24px',
                borderRadius: '10px',
                fontSize: '15px',
                border: 'none',
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              ⚡ Convert All
            </button>
          )}
          {isConverting && (
            <button
              disabled
              style={{
                background: '#3d3560',
                color: '#9d8fff',
                padding: '10px 24px',
                borderRadius: '10px',
                fontSize: '15px',
                border: 'none',
                cursor: 'not-allowed',
                fontWeight: 600,
              }}
            >
              ⏳ Converting…
            </button>
          )}
          {allDone && (
            <span style={{ fontSize: '14px', color: '#22c55e', padding: '10px 0' }}>
              ✅ All conversions complete!
            </span>
          )}
          <button
            onClick={clearAll}
            style={{
              background: 'transparent',
              border: '1px solid #2e2e3d',
              color: '#8888a4',
              padding: '10px 20px',
              borderRadius: '10px',
              fontSize: '14px',
              cursor: 'pointer',
            }}
          >
            Clear All
          </button>
        </div>
      )}
    </div>
  );
}
