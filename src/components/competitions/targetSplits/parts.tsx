import type { CSSProperties } from 'react';
import { formatPerformance } from '../../../lib/scoring';
import type { SolvedRow, SplitStatus } from '../../../lib/targetSplits';

/** Short event codes for compact display (shared with the scoreboards). */
const EVENT_CODES: Record<string, string> = {
  dec_100m: '100M', dec_long_jump: 'LJ', dec_shot_put: 'SP', dec_high_jump: 'HJ',
  dec_400m: '400M', dec_110m_hurdles: '110H', dec_discus: 'DT', dec_pole_vault: 'PV',
  dec_javelin: 'JT', dec_1500m: '1500',
  hep_100m_hurdles: '100H', hep_high_jump: 'HJ', hep_shot_put: 'SP', hep_200m: '200M',
  hep_long_jump: 'LJ', hep_javelin: 'JT', hep_800m: '800M',
};

// Native range thumb is 16px, so its centre travels inset by 8px from each end.
// Overlays must use the same inset to line up exactly with the handle.
const THUMB = 16;
const insetLeft = (frac: number) => `calc(${THUMB / 2}px + ${frac} * (100% - ${THUMB}px))`;

const help = (status: SplitStatus, base: string) =>
  status === 'comfortable'
    ? `At or below the athlete’s ${base} — a comfortable mark.`
    : `Above ${base} — a stretch beyond it, up to a 20% improvement.`;

// ---------- Difficulty pill (vs anchor) ----------
export function DiffPill({ status, delta, base }: { status: SplitStatus; delta: number; base: string }) {
  const map: Record<SplitStatus, { bg: string; fg: string; bd: string; label: string }> = {
    comfortable: { bg: 'var(--pb-soft)', fg: 'var(--pb)', bd: '#C2E5D0', label: delta < 0 ? `${delta} vs ${base}` : `at ${base}` },
    stretch: { bg: 'var(--amber-soft)', fg: 'var(--amber)', bd: '#EAD3A8', label: `+${delta} over ${base}` },
  };
  const t = map[status];
  return (
    <span
      title={help(status, base)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap',
        padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600,
        background: t.bg, color: t.fg, border: `1px solid ${t.bd}`,
      }}
    >
      {status === 'comfortable' && <span style={{ fontWeight: 800 }}>✓</span>}
      {t.label}
    </span>
  );
}

// ---------- Meter-slider: one control whose scale is the meter ----------
// Handle position IS the required mark. Track shows the ±20% band with the
// anchor (PB or average) dead centre; dragging sets the event's required points.
export function MeterSlider({ row, disabled, onChange }: { row: SolvedRow; disabled?: boolean; onChange: (points: number) => void }) {
  const lo = row.floorPoints;
  const hi = row.ceilingPoints;
  const span = Math.max(1, hi - lo);
  const anchorFrac = Math.max(0, Math.min(1, (row.anchorPoints - lo) / span));
  const overAnchor = row.reqPoints > row.anchorPoints + 2;
  const thumb = overAnchor ? 'var(--amber)' : 'var(--pb)';
  const grad = `linear-gradient(to right, var(--pb-soft) 0 ${anchorFrac * 100}%, var(--amber-soft) ${anchorFrac * 100}% 100%)`;
  const inputStyle = { width: '100%', margin: 0, '--track-bg': grad, '--thumb': thumb } as CSSProperties;
  const label = row.usePb ? 'PB' : 'AVG';
  return (
    <div style={{ position: 'relative', paddingTop: 11 }}>
      <div className="micro" style={{ position: 'absolute', top: 0, left: insetLeft(anchorFrac), transform: 'translateX(-50%)', fontSize: 8, color: 'var(--muted)' }}>{label}</div>
      <div className="micro" style={{ position: 'absolute', top: 2, left: 0, fontSize: 8, color: 'var(--muted-2)' }}>−20%</div>
      <div className="micro" style={{ position: 'absolute', top: 2, right: 0, fontSize: 8, color: 'var(--muted-2)' }}>+20%</div>
      <div style={{ position: 'relative', height: 16 }}>
        <input
          type="range"
          className="meter-range"
          min={Math.round(lo)}
          max={Math.round(hi)}
          value={Math.round(row.reqPoints)}
          disabled={disabled}
          onChange={(e) => onChange(Number(e.target.value))}
          style={inputStyle}
        />
        {/* anchor tick — aligned to the thumb's inset travel */}
        <div style={{ position: 'absolute', top: 0, left: insetLeft(anchorFrac), transform: 'translateX(-50%)', width: 2, height: 16, background: 'var(--ink)', pointerEvents: 'none', opacity: disabled ? 0.4 : 0.85 }} />
      </div>
    </div>
  );
}

// ---------- Lock toggle ----------
export function LockBtn({ locked, onClick }: { locked: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={locked ? 'Unlock' : 'Lock this mark (keep it fixed while the others rebalance)'}
      style={{
        width: 32, height: 32, borderRadius: 8, cursor: 'pointer', flexShrink: 0,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        border: `1px solid ${locked ? 'var(--ink)' : 'var(--line)'}`,
        background: locked ? 'var(--ink)' : '#fff',
        color: locked ? '#fff' : 'var(--muted)',
      }}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
        <rect x="4.5" y="10.5" width="15" height="9.5" rx="2" fill={locked ? '#fff' : 'none'} stroke="currentColor" strokeWidth="1.8" />
        <path d={locked ? 'M8 10.5V8a4 4 0 0 1 8 0v2.5' : 'M8 10.5V8a4 4 0 0 1 7.5-2'} stroke="currentColor" strokeWidth="1.8" fill="none" />
      </svg>
    </button>
  );
}

interface RowProps {
  row: SolvedRow;
  /** Handle can't move (locked, or the only unlocked event with a fixed target). */
  disabled: boolean;
  onChange: (points: number) => void;
  onLock: () => void;
  /** Locks only appear in target mode. */
  showLock: boolean;
}

// ---------- Desktop remaining-event row ----------
export function EventRowDesktop({ row, disabled, onChange, onLock, showLock }: RowProps) {
  const rowBg = row.locked ? '#FBFAF6' : '#fff';
  const base = row.usePb ? 'PB' : 'avg';
  const delta = row.reqPoints - row.anchorPoints;
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: `34px 150px 92px 132px 78px 1fr ${showLock ? '44px' : '0px'}`,
        alignItems: 'center', gap: 14, padding: '14px 18px',
        background: rowBg,
        borderBottom: '1px solid var(--line)',
        borderLeft: row.locked ? '3px solid var(--ink)' : '3px solid transparent',
      }}
    >
      <div className="num tnum" style={{ fontSize: 13, fontWeight: 700, color: 'var(--muted-2)', textAlign: 'center' }}>
        {String(row.event.order).padStart(2, '0')}
      </div>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--ink)' }}>{row.event.name}</div>
        <div className="mono" style={{ fontSize: 10, color: 'var(--muted-2)', letterSpacing: '.04em', marginTop: 1 }}>{EVENT_CODES[row.event.id] ?? ''}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num tnum" style={{ fontSize: 15, color: 'var(--muted)' }}>{formatPerformance(row.event, row.anchorMark)}</div>
        <div style={{ fontSize: 10, color: 'var(--muted-2)', marginTop: 1 }}>{row.usePb ? 'PB anchor' : 'avg anchor'}</div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div className="num tnum" style={{ fontSize: 26, fontWeight: 800, lineHeight: 1, color: 'var(--ink)' }}>
          {formatPerformance(row.event, row.mark)}
        </div>
        <div className="num tnum" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{row.reqPoints} pts</div>
      </div>
      <div><DiffPill status={row.status} delta={delta} base={base} /></div>
      <MeterSlider row={row} disabled={disabled} onChange={onChange} />
      {showLock ? <LockBtn locked={row.locked} onClick={onLock} /> : <span />}
    </div>
  );
}

// ---------- Mobile remaining-event card ----------
export function EventRowMobile({ row, disabled, onChange, onLock, showLock }: RowProps) {
  const base = row.usePb ? 'PB' : 'avg';
  const delta = row.reqPoints - row.anchorPoints;
  return (
    <div
      style={{
        background: '#fff',
        border: `1px solid ${row.locked ? 'var(--ink)' : 'var(--line)'}`,
        borderLeft: row.locked ? '3px solid var(--ink)' : '1px solid var(--line)',
        borderRadius: 12, padding: '12px 13px',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
          <span className="num tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)' }}>{String(row.event.order).padStart(2, '0')}</span>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600 }}>{row.event.name}</div>
            <div className="num tnum" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>{row.usePb ? 'PB' : 'avg'} {formatPerformance(row.event, row.anchorMark)}</div>
          </div>
        </div>
        <div style={{ textAlign: 'right', flexShrink: 0 }}>
          <div className="num tnum" style={{ fontSize: 24, fontWeight: 800, lineHeight: 1, color: 'var(--ink)' }}>{formatPerformance(row.event, row.mark)}</div>
          <div className="num tnum" style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{row.reqPoints} pts</div>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 10 }}>
        <DiffPill status={row.status} delta={delta} base={base} />
        {showLock && <LockBtn locked={row.locked} onClick={onLock} />}
      </div>
      <div style={{ marginTop: 4 }}>
        <MeterSlider row={row} disabled={disabled} onChange={onChange} />
      </div>
    </div>
  );
}

// ---------- Legend explaining the scale ----------
export function Legend() {
  const chip = (bg: string, bd: string): CSSProperties => ({ width: 12, height: 12, borderRadius: 3, background: bg, border: `1px solid ${bd}`, display: 'inline-block', flexShrink: 0 });
  return (
    <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap', alignItems: 'center', fontSize: 11.5, color: 'var(--muted)' }}>
      <span>Each slider spans ±20% of the anchor in points (PB, or an average when none):</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={chip('var(--pb-soft)', '#C2E5D0')} /> at / below anchor — comfortable</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><span style={chip('var(--amber-soft)', '#EAD3A8')} /> above — a stretch (up to +20%)</span>
    </div>
  );
}
