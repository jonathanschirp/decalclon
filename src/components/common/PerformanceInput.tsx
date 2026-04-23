import { useState, useEffect } from 'react';
import type { EventDefinition } from '../../types';
import { calculatePoints, parseTimeInput, formatTime } from '../../lib/scoring';

interface Props {
  event: EventDefinition;
  value?: number | null;
  onChange: (value: number) => void;
  onDNS?: () => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

const LONG_TRACK_IDS = new Set(['dec_400m', 'dec_1500m', 'hep_800m']);

function unitLabel(event: EventDefinition): string {
  if (event.type === 'field') return 'meters';
  if (LONG_TRACK_IDS.has(event.id)) return 'm:ss.xx';
  return 'seconds';
}

function placeholderFor(event: EventDefinition): string {
  if (event.type === 'field') return 'e.g. 7.65';
  if (LONG_TRACK_IDS.has(event.id)) return 'e.g. 4:11.30';
  return 'e.g. 10.85';
}

export function PerformanceInput({ event, value, onChange, onDNS, onCancel, autoFocus }: Props) {
  const [input, setInput] = useState(() => {
    if (value == null) return '';
    if (event.type === 'track') return formatTime(value);
    return String(value);
  });
  const [points, setPoints] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const parsed = event.type === 'track' ? parseTimeInput(input) : parseFloat(input);
    if (parsed != null && parsed > 0) {
      setPoints(calculatePoints(event, parsed));
      setError('');
    } else if (input.trim()) {
      setPoints(null);
      setError('Invalid value');
    } else {
      setPoints(null);
      setError('');
    }
  }, [input, event]);

  const handleSubmit = () => {
    const parsed = event.type === 'track' ? parseTimeInput(input) : parseFloat(input);
    if (parsed != null && parsed > 0) {
      onChange(parsed);
    }
  };

  const btnBase: React.CSSProperties = {
    padding: '7px 12px', fontSize: 12, fontWeight: 600,
    border: 'none', borderRadius: 6, cursor: 'pointer',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {/* Unit label */}
      <div className="micro" style={{ color: 'var(--muted-2)' }}>{unitLabel(event)}</div>

      <div style={{ display: 'flex', gap: 6 }}>
        <input
          type="text"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onCancel?.();
          }}
          placeholder={placeholderFor(event)}
          autoFocus={autoFocus}
          className="mono tnum"
          style={{
            flex: 1, minWidth: 0,
            padding: '8px 10px', fontSize: 14,
            border: '1px solid var(--line)', borderRadius: 6,
            background: '#fff', color: 'var(--ink)',
            outline: 'none',
          }}
        />
        <button
          type="button"
          onClick={handleSubmit}
          disabled={points === null}
          style={{
            ...btnBase,
            background: 'var(--ink)', color: '#fff',
            opacity: points === null ? 0.4 : 1,
          }}
        >
          Save
        </button>
        {onDNS && (
          <button
            type="button"
            onClick={onDNS}
            style={{
              ...btnBase,
              background: 'var(--live-soft)', color: 'var(--live)',
            }}
          >
            DNS
          </button>
        )}
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            style={{
              ...btnBase,
              background: 'var(--bg)', color: 'var(--muted)',
              border: '1px solid var(--line)',
            }}
          >
            ✕
          </button>
        )}
      </div>

      {/* Feedback row */}
      {points !== null && (
        <span className="num tnum" style={{ fontSize: 12, color: 'var(--pb)', fontWeight: 700 }}>{points} pts</span>
      )}
      {error && (
        <span style={{ fontSize: 12, color: 'var(--live)' }}>{error}</span>
      )}
    </div>
  );
}
