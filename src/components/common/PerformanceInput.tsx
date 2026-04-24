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

const LONG_TRACK_IDS = new Set(['dec_1500m', 'hep_800m']);

function unitLabel(event: EventDefinition): string {
  if (event.type === 'field') return 'meters';
  if (LONG_TRACK_IDS.has(event.id)) return 'm:ss.xx';
  return 'seconds';
}

const PLACEHOLDERS: Record<string, string> = {
  // Decathlon
  dec_100m: 'e.g. 10.64',
  dec_long_jump: 'e.g. 7.84',
  dec_shot_put: 'e.g. 16.05',
  dec_high_jump: 'e.g. 2.11',
  dec_400m: 'e.g. 47.12',
  dec_110m_hurdles: 'e.g. 13.72',
  dec_discus: 'e.g. 50.32',
  dec_pole_vault: 'e.g. 5.20',
  dec_javelin: 'e.g. 71.18',
  dec_1500m: 'e.g. 4:21.30',
  // Heptathlon
  hep_100m_hurdles: 'e.g. 12.84',
  hep_high_jump: 'e.g. 1.92',
  hep_shot_put: 'e.g. 14.28',
  hep_200m: 'e.g. 23.15',
  hep_long_jump: 'e.g. 6.68',
  hep_javelin: 'e.g. 53.86',
  hep_800m: 'e.g. 2:08.50',
};

function placeholderFor(event: EventDefinition): string {
  return PLACEHOLDERS[event.id] ?? (event.type === 'field' ? 'e.g. 7.65' : 'e.g. 10.85');
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
          inputMode={LONG_TRACK_IDS.has(event.id) ? 'text' : 'decimal'}
          value={input}
          onChange={(e) => setInput(e.target.value.replace(/,/g, '.'))}
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
