import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from 'react';

type PdfAction = 'remove-password' | 'add-password';

interface PdfState {
  file: File | null;
  action: PdfAction;
  password: string;
  newPassword: string;
  ownerPassword: string;
  status: 'idle' | 'processing' | 'done' | 'error';
  downloadUrl?: string;
  downloadName?: string;
  errorMessage?: string;
}

const INITIAL_STATE: PdfState = {
  file: null,
  action: 'remove-password',
  password: '',
  newPassword: '',
  ownerPassword: '',
  status: 'idle',
};

export default function PdfTools() {
  const [state, setState] = useState<PdfState>(INITIAL_STATE);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function setFile(file: File | null) {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
    setState({ ...INITIAL_STATE, file });
  }

  const onDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && file.name.toLowerCase().endsWith('.pdf')) {
      setFile(file);
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
    const file = e.target.files?.[0];
    if (file) {
      setFile(file);
      e.target.value = '';
    }
  }, []);

  function humanSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  async function handleProcess() {
    if (!state.file) return;

    setState((prev) => ({ ...prev, status: 'processing', errorMessage: undefined }));

    try {
      const formData = new FormData();
      formData.append('file', state.file);
      formData.append('action', state.action);

      if (state.action === 'remove-password') {
        formData.append('password', state.password);
      } else {
        formData.append('newPassword', state.newPassword);
        if (state.ownerPassword) {
          formData.append('ownerPassword', state.ownerPassword);
        }
      }

      const res = await fetch('/api/pdf', { method: 'POST', body: formData });

      if (!res.ok) {
        const json = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(json.error ?? res.statusText);
      }

      const blob = await res.blob();
      const downloadUrl = URL.createObjectURL(blob);

      const disposition = res.headers.get('Content-Disposition') ?? '';
      const match = disposition.match(/filename="([^"]+)"/);
      const downloadName = match ? match[1] : 'output.pdf';

      setState((prev) => ({ ...prev, status: 'done', downloadUrl, downloadName }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Processing failed';
      setState((prev) => ({ ...prev, status: 'error', errorMessage: msg }));
    }
  }

  function reset() {
    if (state.downloadUrl) URL.revokeObjectURL(state.downloadUrl);
    setState(INITIAL_STATE);
  }

  const canProcess =
    state.file &&
    state.status !== 'processing' &&
    ((state.action === 'remove-password' && state.password.length > 0) ||
      (state.action === 'add-password' && state.newPassword.length > 0));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ fontSize: '24px' }}>🔒</span>
        <div>
          <h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600, color: '#e8e8f0' }}>
            PDF Password Tools
          </h2>
          <p style={{ margin: '2px 0 0', fontSize: '13px', color: '#8888a4' }}>
            Add or remove password protection from PDF files
          </p>
        </div>
      </div>

      {/* Drop Zone */}
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        onClick={() => inputRef.current?.click()}
        style={{
          border: `2px dashed ${isDragging ? '#7c6af7' : '#2e2e3d'}`,
          borderRadius: '12px',
          padding: '32px 24px',
          textAlign: 'center',
          cursor: 'pointer',
          background: isDragging ? 'rgba(124, 106, 247, 0.08)' : 'transparent',
          transition: 'all 0.2s ease',
        }}
      >
        {state.file ? (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#e8e8f0' }}>
              {state.file.name}
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8888a4' }}>
              {humanSize(state.file.size)} · Click to change file
            </p>
          </div>
        ) : (
          <div>
            <div style={{ fontSize: '32px', marginBottom: '8px' }}>📄</div>
            <p style={{ margin: 0, fontSize: '14px', fontWeight: 500, color: '#e8e8f0' }}>
              Drop a PDF file here or click to browse
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#8888a4' }}>
              Only PDF files are accepted
            </p>
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".pdf"
          style={{ display: 'none' }}
          onChange={onFileInput}
        />
      </div>

      {/* Action & Options */}
      {state.file && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Action Toggle */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  action: 'remove-password',
                  status: 'idle',
                  errorMessage: undefined,
                  downloadUrl: undefined,
                }))
              }
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                border: `1px solid ${state.action === 'remove-password' ? '#7c6af7' : '#2e2e3d'}`,
                background: state.action === 'remove-password' ? 'rgba(124, 106, 247, 0.15)' : '#22222d',
                color: state.action === 'remove-password' ? '#b4a5ff' : '#8888a4',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🔓 Remove Password
            </button>
            <button
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  action: 'add-password',
                  status: 'idle',
                  errorMessage: undefined,
                  downloadUrl: undefined,
                }))
              }
              style={{
                flex: 1,
                padding: '10px 16px',
                borderRadius: '10px',
                border: `1px solid ${state.action === 'add-password' ? '#7c6af7' : '#2e2e3d'}`,
                background: state.action === 'add-password' ? 'rgba(124, 106, 247, 0.15)' : '#22222d',
                color: state.action === 'add-password' ? '#b4a5ff' : '#8888a4',
                fontSize: '13px',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              🔐 Add Password
            </button>
          </div>

          {/* Password Fields */}
          {state.action === 'remove-password' ? (
            <div>
              <label
                style={{ display: 'block', fontSize: '12px', color: '#8888a4', marginBottom: '6px' }}
              >
                Current PDF Password
              </label>
              <input
                type="password"
                value={state.password}
                onChange={(e) => setState((prev) => ({ ...prev, password: e.target.value }))}
                placeholder="Enter the current password"
                style={{
                  width: '100%',
                  padding: '10px 14px',
                  borderRadius: '10px',
                  border: '1px solid #2e2e3d',
                  background: '#22222d',
                  color: '#e8e8f0',
                  fontSize: '14px',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div>
                <label
                  style={{ display: 'block', fontSize: '12px', color: '#8888a4', marginBottom: '6px' }}
                >
                  New Password <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="password"
                  value={state.newPassword}
                  onChange={(e) => setState((prev) => ({ ...prev, newPassword: e.target.value }))}
                  placeholder="Enter the new password"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #2e2e3d',
                    background: '#22222d',
                    color: '#e8e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
              <div>
                <label
                  style={{ display: 'block', fontSize: '12px', color: '#8888a4', marginBottom: '6px' }}
                >
                  Owner Password{' '}
                  <span style={{ fontSize: '11px', color: '#666' }}>(optional — defaults to user password)</span>
                </label>
                <input
                  type="password"
                  value={state.ownerPassword}
                  onChange={(e) => setState((prev) => ({ ...prev, ownerPassword: e.target.value }))}
                  placeholder="Enter the owner password (optional)"
                  style={{
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: '10px',
                    border: '1px solid #2e2e3d',
                    background: '#22222d',
                    color: '#e8e8f0',
                    fontSize: '14px',
                    outline: 'none',
                    boxSizing: 'border-box',
                  }}
                />
              </div>
            </div>
          )}

          {/* Error message */}
          {state.errorMessage && (
            <p style={{ margin: 0, fontSize: '13px', color: '#ef4444' }}>⚠ {state.errorMessage}</p>
          )}

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {state.status === 'done' && state.downloadUrl ? (
              <a
                href={state.downloadUrl}
                download={state.downloadName}
                style={{
                  background: '#22c55e',
                  color: '#fff',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  textDecoration: 'none',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                ⬇ Download PDF
              </a>
            ) : (
              <button
                onClick={handleProcess}
                disabled={!canProcess}
                style={{
                  background: canProcess ? '#7c6af7' : '#3d3560',
                  color: canProcess ? '#fff' : '#9d8fff',
                  padding: '10px 24px',
                  borderRadius: '10px',
                  fontSize: '14px',
                  fontWeight: 600,
                  border: 'none',
                  cursor: canProcess ? 'pointer' : 'not-allowed',
                }}
              >
                {state.status === 'processing'
                  ? '⏳ Processing…'
                  : state.action === 'remove-password'
                    ? '🔓 Remove Password'
                    : '🔐 Add Password'}
              </button>
            )}

            <button
              onClick={reset}
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
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
