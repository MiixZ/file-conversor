import { useEffect, useState } from 'react';

export default function VisitCounter() {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    fetch('/api/visits', { method: 'POST' })
      .then((res) => res.json())
      .then((data: { count: number }) => setCount(data.count))
      .catch((err) => console.error('[VisitCounter] failed to record visit:', err));
  }, []);

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontSize: '14px',
        color: '#8888a4',
        marginTop: '16px',
        padding: '6px 14px',
        background: '#18181f',
        border: '1px solid #2e2e3d',
        borderRadius: '999px',
      }}
    >
      <span style={{ fontSize: '15px' }}>👁️</span>
      <span>
        {count === null ? '…' : (
          <>
            <span style={{ color: '#7c6af7', fontWeight: 600 }}>
              {count.toLocaleString()}
            </span>
            {' '}
            {count === 1 ? 'visit' : 'visits'}
          </>
        )}
      </span>
    </div>
  );
}
