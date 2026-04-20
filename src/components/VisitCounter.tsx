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
        fontSize: '13px',
        color: '#8888a4',
        marginTop: '12px',
      }}
    >
      <span style={{ fontSize: '15px' }}>👁️</span>
      <span>
        {count === null ? '…' : `${count.toLocaleString()} ${count === 1 ? 'visit' : 'visits'}`}
      </span>
    </div>
  );
}
