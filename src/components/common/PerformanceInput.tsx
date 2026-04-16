import { useState, useEffect } from 'react';
import type { EventDefinition } from '../../types';
import { calculatePoints, parseTimeInput } from '../../lib/scoring';

interface Props {
  event: EventDefinition;
  value?: number | null;
  onChange: (value: number) => void;
  onCancel?: () => void;
  autoFocus?: boolean;
}

export function PerformanceInput({ event, value, onChange, onCancel, autoFocus }: Props) {
  const [input, setInput] = useState(value != null ? String(value) : '');
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

  const placeholder = event.type === 'track'
    ? (event.measurementUnit === 'seconds' ? '10.85 or 4:11.30' : '10.85')
    : '7.65';

  return (
    <div className="flex flex-col gap-1">
      <div className="flex gap-1">
        <input
          type="text"
          inputMode="decimal"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleSubmit();
            if (e.key === 'Escape') onCancel?.();
          }}
          placeholder={placeholder}
          autoFocus={autoFocus}
          className="flex-1 sm:flex-none sm:w-28 min-w-0 px-2 py-2 sm:py-1 text-base sm:text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button
          onClick={handleSubmit}
          disabled={points === null}
          className="px-3 py-2 sm:py-1 text-sm sm:text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="px-3 py-2 sm:py-1 text-sm sm:text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300"
          >
            ✕
          </button>
        )}
      </div>
      {points !== null && (
        <span className="text-xs text-green-700 font-medium">{points} pts</span>
      )}
      {error && <span className="text-xs text-red-600">{error}</span>}
    </div>
  );
}
