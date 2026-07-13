import { useEffect, useMemo, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';
import type { Athlete, Competition } from '../../../types';
import {
  buildTargetModel,
  clampToEvent,
  summarize,
  waterfill,
  type CalcMode,
  type Summary,
  type TargetModel,
} from '../../../lib/targetSplits';
import { EventRowDesktop, EventRowMobile, Legend } from './parts';

const cardStyle = { background: '#fff', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' } as const;

interface Props {
  competition: Competition;
  athlete: Athlete;
  athletes: Athlete[];
  onBack: () => void;
  onSwitchAthlete: (athleteId: string) => void;
}

/**
 * Calculator state: the chosen required points per event (`req` — the handle
 * positions), plus mode / target / locks. In target mode the unlocked handles
 * are kept summing to `target − banked − locked` via {@link waterfill}, so
 * moving one physically moves the others.
 */
function useTargetCalc(model: TargetModel) {
  const [mode, setMode] = useState<CalcMode>('explore');
  const [target, setTarget] = useState(() => Math.round(model.pbProjection));
  const [locks, setLocks] = useState<Record<string, boolean>>({});
  const [req, setReq] = useState<Record<string, number>>(() => {
    const o: Record<string, number> = {};
    for (const r of model.remaining) o[r.event.id] = r.startPoints;
    return o;
  });

  const byId = (id: string) => model.remaining.find((r) => r.event.id === id)!;
  const lockedSum = model.remaining
    .filter((r) => locks[r.event.id])
    .reduce((t, r) => t + (req[r.event.id] ?? r.startPoints), 0);
  const unlocked = model.remaining.filter((r) => !locks[r.event.id]);

  // Drag one handle to `points`.
  const onChange = (id: string, points: number) => {
    const r = byId(id);
    const clamped = clampToEvent(r, points);

    if (mode === 'explore' || locks[id]) {
      setReq({ ...req, [id]: clamped });
      return;
    }

    // Target mode: hold the sum by pushing the other unlocked events.
    const others = unlocked.filter((x) => x.event.id !== id);
    if (others.length === 0) return; // only unlocked event — fully determined, can't move
    const R = target - model.banked - lockedSum;
    const items = others.map((x) => ({ value: req[x.event.id], min: x.floorPoints, max: x.ceilingPoints }));
    const filled = waterfill(items, R - clamped);
    const achieved = filled.reduce((a, b) => a + b, 0);
    const next = { ...req, [id]: clampToEvent(r, R - achieved) };
    others.forEach((x, k) => { next[x.event.id] = filled[k]; });
    setReq(next);
  };

  const changeTarget = (v: number) => {
    setTarget(v);
    if (mode !== 'target') return;
    const R = v - model.banked - lockedSum;
    const items = unlocked.map((x) => ({ value: req[x.event.id], min: x.floorPoints, max: x.ceilingPoints }));
    const filled = waterfill(items, R);
    const next = { ...req };
    unlocked.forEach((x, k) => { next[x.event.id] = filled[k]; });
    setReq(next);
  };

  const toggleMode = () => {
    if (mode === 'target') { setMode('explore'); return; }
    // Enabling target: fix it at the current projected total so nothing jumps
    // (the constraint sum(unlocked) = target − banked − locked already holds).
    const projected = model.banked + model.remaining.reduce((t, r) => t + (req[r.event.id] ?? r.startPoints), 0);
    setTarget(projected);
    setMode('target');
  };

  const toggleLock = (id: string) => {
    const nextLocks = { ...locks, [id]: !locks[id] };
    if (mode === 'target') {
      const nextLockedSum = model.remaining
        .filter((r) => nextLocks[r.event.id])
        .reduce((t, r) => t + (req[r.event.id] ?? r.startPoints), 0);
      const nextUnlocked = model.remaining.filter((r) => !nextLocks[r.event.id]);
      const items = nextUnlocked.map((x) => ({ value: req[x.event.id], min: x.floorPoints, max: x.ceilingPoints }));
      const filled = waterfill(items, target - model.banked - nextLockedSum);
      const next = { ...req };
      nextUnlocked.forEach((x, k) => { next[x.event.id] = filled[k]; });
      setReq(next);
    }
    setLocks(nextLocks);
  };

  const reset = () => {
    const base: Record<string, number> = {};
    for (const r of model.remaining) base[r.event.id] = r.startPoints;
    setReq(base);
    setLocks({});
    if (mode === 'target') setTarget(Math.round(model.pbProjection));
  };

  const summary = useMemo(
    () => summarize({ model, req, mode, target, locks }),
    [model, req, mode, target, locks],
  );

  // A handle is fixed if locked, or it's the only unlocked event with a set target.
  const rowDisabled = (id: string) =>
    !!locks[id] || (mode === 'target' && !locks[id] && unlocked.length === 1);

  return { mode, toggleMode, target, changeTarget, onChange, toggleLock, reset, summary, rowDisabled };
}

type Calc = ReturnType<typeof useTargetCalc>;

const TARGET_MAX = 11000;

/** Editable target field — edits as free text, settles on blur (empty → banked). */
function TargetInput({ value, banked, onCommit, style }: { value: number; banked: number; onCommit: (v: number) => void; style: CSSProperties }) {
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); }, [value]);
  return (
    <input
      value={text}
      inputMode="numeric"
      className="num tnum"
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, '').slice(0, 5);
        setText(digits);
        if (digits !== '') onCommit(Math.min(TARGET_MAX, Number(digits)));
      }}
      onBlur={() => {
        const digits = text.replace(/\D/g, '');
        const next = digits === '' ? banked : Math.min(TARGET_MAX, Number(digits));
        setText(String(next));
        onCommit(next);
      }}
      style={style}
    />
  );
}

// ---------- Mode toggle (Explore ↔ Target) ----------
function ModeToggle({ mode, onToggle }: { mode: CalcMode; onToggle: () => void }) {
  const on = mode === 'target';
  return (
    <button
      onClick={onToggle}
      title={on ? 'Chasing a fixed total — sliders trade points to stay on target' : 'Free exploration — move any slider independently'}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 9, padding: '6px 10px 6px 12px',
        borderRadius: 999, border: `1px solid ${on ? 'var(--ink)' : 'var(--line)'}`,
        background: '#fff', cursor: 'pointer', fontSize: 12, fontWeight: 600, color: 'var(--ink)',
      }}
    >
      Fix target score
      <span style={{ position: 'relative', width: 34, height: 18, borderRadius: 999, background: on ? 'var(--ink)' : 'var(--line-2)', transition: 'background .15s' }}>
        <span style={{ position: 'absolute', top: 2, left: on ? 18 : 2, width: 14, height: 14, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
      </span>
    </button>
  );
}

// ---------- Preset shortcuts (target mode only) ----------
function PresetBar({ model, target, setTarget }: { model: TargetModel; target: number; setTarget: (v: number) => void }) {
  const pb = model.pbProjection;
  const presets = [
    { label: 'Comfortable', v: pb - 260 },
    { label: 'Feasible', v: pb + 180 },
    { label: 'Ambitious', v: pb + 520 },
  ].filter((p) => p.v > model.banked);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
      <span className="micro" style={{ color: 'var(--muted-2)' }}>JUMP TO</span>
      {presets.map((p) => {
        const active = Math.abs(target - p.v) < 1;
        return (
          <button
            key={p.label}
            onClick={() => setTarget(p.v)}
            style={{
              padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--line)'}`,
              background: active ? 'var(--ink)' : '#fff', color: active ? '#fff' : 'var(--ink-2)',
            }}
          >
            {p.label} · {p.v}
          </button>
        );
      })}
    </div>
  );
}

function StatCell({ label, children, bg }: { label: string; children: ReactNode; bg?: string }) {
  return (
    <div style={{ background: bg ?? '#fff', padding: '16px 18px' }}>
      <div className="micro" style={{ color: 'var(--muted-2)' }}>{label}</div>
      {children}
    </div>
  );
}

function AthleteCell({ model }: { model: TargetModel }) {
  return (
    <div style={{ background: '#fff', padding: '16px 18px' }}>
      <div className="micro" style={{ color: 'var(--muted-2)' }}>ATHLETE</div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
        {model.athlete.nationality && (
          <span className="mono" style={{ fontSize: 10, fontWeight: 700, border: '1px solid var(--line)', borderRadius: 3, padding: '2px 5px' }}>{model.athlete.nationality.slice(0, 3).toUpperCase()}</span>
        )}
        <span style={{ fontSize: 17, fontWeight: 700 }}>{model.athlete.name}</span>
      </div>
      {model.athlete.combinedPB != null && (
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Combined PB <span className="num tnum" style={{ color: 'var(--ink)', fontWeight: 700 }}>{model.athlete.combinedPB}</span></div>
      )}
    </div>
  );
}

const bigNum: CSSProperties = { fontSize: 30, fontWeight: 800, lineHeight: 1, marginTop: 4 };

// ---------- Stat header (desktop), mode-aware ----------
function StatHeader({ model, calc }: { model: TargetModel; calc: Calc }) {
  const { mode, target, changeTarget, summary } = calc;
  const remaining = model.remaining.length;

  if (mode === 'target') {
    const gap = summary.gap;
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
        <AthleteCell model={model} />
        <StatCell label="BANKED">
          <div className="num tnum" style={bigNum}>{model.banked}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{remaining} to go</div>
        </StatCell>
        <StatCell label="TARGET">
          <TargetInput value={target} banked={model.banked} onCommit={changeTarget} style={{ ...bigNum, width: '100%', border: 'none', outline: 'none', background: 'transparent', color: 'var(--brand)', padding: 0, borderBottom: '2px dashed var(--brand)' }} />
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>click to edit</div>
        </StatCell>
        <StatCell label="GAP TO TARGET" bg={gap > 0 ? '#fff' : 'var(--pb-soft)'}>
          <div className="num tnum" style={{ ...bigNum, color: gap > 0 ? 'var(--ink)' : 'var(--pb)' }}>{gap}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>needed across {remaining} events</div>
        </StatCell>
      </div>
    );
  }

  // Explore mode
  const vs = summary.vsCombinedPB;
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr 1fr 1.1fr', gap: 1, background: 'var(--line)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
      <AthleteCell model={model} />
      <StatCell label="BANKED">
        <div className="num tnum" style={bigNum}>{model.banked}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{remaining} to go</div>
      </StatCell>
      <StatCell label="PROJECTED TOTAL">
        <div className="num tnum" style={{ ...bigNum, color: 'var(--brand)' }}>{summary.projected}</div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>from your chosen marks</div>
      </StatCell>
      {summary.combinedPB != null && vs != null ? (
        <StatCell label="VS COMBINED PB" bg={vs >= 0 ? 'var(--pb-soft)' : '#fff'}>
          <div className="num tnum" style={{ ...bigNum, color: vs >= 0 ? 'var(--pb)' : 'var(--live)' }}>{vs >= 0 ? `+${vs}` : vs}</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>vs PB of {summary.combinedPB}</div>
        </StatCell>
      ) : (
        <StatCell label="VS PB PROJECTION">
          <div className="num tnum" style={{ ...bigNum, color: 'var(--muted-2)' }}>—</div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>no combined PB on file</div>
        </StatCell>
      )}
    </div>
  );
}

const VERDICT: Record<string, { bg: string; fg: string; bd: string; label: string; icon: string; note: (s: Summary, pb: number) => string }> = {
  comfortable: { bg: 'var(--pb-soft)', fg: 'var(--pb)', bd: '#C2E5D0', label: 'COMFORTABLE', icon: '✓', note: (_s, pb) => `PBs alone project ${pb} — this target sits at or below that.` },
  feasible: { bg: '#fff', fg: 'var(--ink)', bd: 'var(--line)', label: 'FEASIBLE', icon: '◎', note: () => 'Reachable — some events sit above PB. Drag a slider to trade effort.' },
  infeasible: { bg: 'var(--live-soft)', fg: 'var(--live)', bd: '#F6C7C2', label: 'NOT REACHABLE', icon: '△', note: (s) => `Even at +20% on every remaining event the total tops out around ${s.reachableMax}.` },
};

// ---------- Bottom bar: verdict (target) or projection recap (explore) ----------
function SummaryBar({ model, summary }: { model: TargetModel; summary: Summary }) {
  const recon = (label: string, value: number, big?: boolean, color?: string) => (
    <div style={{ textAlign: 'right' }}>
      <div className="micro" style={{ color: 'var(--muted-2)', fontFamily: 'Inter' }}>{label}</div>
      <div className="num tnum" style={{ fontSize: big ? 22 : 18, fontWeight: big ? 800 : 700, color: color ?? 'var(--ink)' }}>{value}</div>
    </div>
  );

  if (summary.mode === 'explore') {
    return (
      <div style={{ ...cardStyle, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
          Move any slider within ±20% of each PB (in points) — the projected total updates live.
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {recon('Banked', model.banked)}
          <span className="num" style={{ fontSize: 18, color: 'var(--muted-2)' }}>+</span>
          {recon('Chosen marks', summary.sumReq)}
          <span className="num" style={{ fontSize: 18, color: 'var(--muted-2)' }}>=</span>
          {recon('Projected', summary.projected, true, 'var(--brand)')}
        </div>
      </div>
    );
  }

  const t = VERDICT[summary.verdict];
  return (
    <div style={{ background: t.bg, border: `1px solid ${t.bd}`, borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '5px 11px', borderRadius: 999, background: t.fg, color: '#fff', fontSize: 12, fontWeight: 800, letterSpacing: '.04em' }}>
          {t.icon} {t.label}
        </span>
        <span style={{ fontSize: 13, color: 'var(--ink-2)', maxWidth: 420 }}>{t.note(summary, model.pbProjection)}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {recon('Banked', model.banked)}
        <span className="num" style={{ fontSize: 18, color: 'var(--muted-2)' }}>+</span>
        {recon('Required', summary.sumReq)}
        <span className="num" style={{ fontSize: 18, color: 'var(--muted-2)' }}>=</span>
        {recon('Projected', summary.projected, true, t.fg)}
        <span className="num" style={{ fontSize: 18, color: 'var(--muted-2)' }}>→</span>
        {recon('Target', summary.target, true)}
      </div>
    </div>
  );
}

// ---------- Desktop layout ----------
function CalculatorDesktop({ model, calc }: { model: TargetModel; calc: Calc }) {
  const { mode, toggleMode, target, changeTarget, onChange, toggleLock, reset, summary, rowDisabled } = calc;
  const showLock = mode === 'target';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>TARGET SPLITS · {mode === 'target' ? 'CHASING A TOTAL' : 'EXPLORE'}</div>
          <h2 className="display" style={{ fontSize: 26, fontWeight: 700, margin: 0 }}>
            {mode === 'target' ? `What it takes to reach ${target}` : `${model.athlete.name.split(' ')[0]}’s possible finish`}
          </h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          {mode === 'target' && <PresetBar model={model} target={target} setTarget={changeTarget} />}
          <ModeToggle mode={mode} onToggle={toggleMode} />
          <button
            onClick={reset}
            style={{ padding: '6px 12px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--line)', background: '#fff', color: 'var(--muted)' }}
          >
            ↺ Reset to PB
          </button>
        </div>
      </div>

      <StatHeader model={model} calc={calc} />

      <div style={cardStyle}>
        <div style={{ display: 'grid', gridTemplateColumns: `34px 150px 92px 132px 78px 1fr ${showLock ? '44px' : '0px'}`, gap: 14, padding: '10px 18px', background: 'var(--bg-2)', borderBottom: '1px solid var(--line)' }}>
          <div className="micro" style={{ color: 'var(--muted-2)', textAlign: 'center' }}>#</div>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>REMAINING EVENT</div>
          <div className="micro" style={{ color: 'var(--muted-2)', textAlign: 'right' }}>PB</div>
          <div className="micro" style={{ color: 'var(--muted-2)', textAlign: 'right' }}>REQUIRED MARK</div>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>VS PB</div>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>{mode === 'target' ? 'DRAG · OTHERS REBALANCE' : 'DRAG · −20% → +20%'}</div>
          {showLock ? <div className="micro" style={{ color: 'var(--muted-2)', textAlign: 'center' }}>LOCK</div> : <span />}
        </div>
        {summary.rows.map((row) => (
          <EventRowDesktop
            key={row.event.id}
            row={row}
            disabled={rowDisabled(row.event.id)}
            onChange={(pts) => onChange(row.event.id, pts)}
            onLock={() => toggleLock(row.event.id)}
            showLock={showLock}
          />
        ))}
      </div>

      <Legend />
      <SummaryBar model={model} summary={summary} />
    </div>
  );
}

// ---------- Mobile layout ----------
function CalculatorMobile({ model, calc }: { model: TargetModel; calc: Calc }) {
  const { mode, toggleMode, target, changeTarget, onChange, toggleLock, reset, summary, rowDisabled } = calc;
  const showLock = mode === 'target';
  const v = summary.verdict;
  const vColor = v === 'infeasible' ? 'var(--live)' : v === 'comfortable' ? 'var(--pb)' : 'var(--ink)';
  const stripBg = mode === 'explore' ? 'var(--bg-2)' : v === 'infeasible' ? 'var(--live-soft)' : v === 'comfortable' ? 'var(--pb-soft)' : 'var(--bg-2)';
  const vLabel = v === 'infeasible' ? '△ NOT REACHABLE' : v === 'comfortable' ? '✓ COMFORTABLE' : '◎ FEASIBLE';

  return (
    <div style={{ display: 'flex', flexDirection: 'column' }}>
      {/* mode toggle + reset */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, padding: '4px 0 12px' }}>
        <ModeToggle mode={mode} onToggle={toggleMode} />
        <button onClick={reset} style={{ padding: '6px 10px', borderRadius: 8, fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid var(--line)', background: '#fff', color: 'var(--muted)' }}>↺ Reset</button>
      </div>

      {/* stat strip */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
        <div>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>BANKED</div>
          <div className="num tnum" style={{ fontSize: 22, fontWeight: 800 }}>{model.banked}</div>
        </div>
        {mode === 'target' ? (
          <>
            <div>
              <div className="micro" style={{ color: 'var(--muted-2)' }}>TARGET</div>
              <TargetInput value={target} banked={model.banked} onCommit={changeTarget} style={{ width: '100%', border: 'none', outline: 'none', background: 'transparent', fontSize: 22, fontWeight: 800, color: 'var(--brand)', padding: 0, borderBottom: '2px dashed var(--brand)' }} />
            </div>
            <div>
              <div className="micro" style={{ color: 'var(--muted-2)' }}>GAP</div>
              <div className="num tnum" style={{ fontSize: 22, fontWeight: 800 }}>{summary.gap}</div>
            </div>
          </>
        ) : (
          <>
            <div>
              <div className="micro" style={{ color: 'var(--muted-2)' }}>PROJECTED</div>
              <div className="num tnum" style={{ fontSize: 22, fontWeight: 800, color: 'var(--brand)' }}>{summary.projected}</div>
            </div>
            <div>
              <div className="micro" style={{ color: 'var(--muted-2)' }}>VS PB</div>
              <div className="num tnum" style={{ fontSize: 22, fontWeight: 800, color: (summary.vsCombinedPB ?? 0) >= 0 ? 'var(--pb)' : 'var(--live)' }}>
                {summary.vsCombinedPB == null ? '—' : summary.vsCombinedPB >= 0 ? `+${summary.vsCombinedPB}` : summary.vsCombinedPB}
              </div>
            </div>
          </>
        )}
      </div>

      {/* recap strip */}
      <div style={{ marginTop: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', gap: 10, background: stripBg, border: '1px solid var(--line)', borderRadius: 10, flexWrap: 'wrap' }}>
        {mode === 'target' && (
          <span style={{ padding: '4px 9px', borderRadius: 999, background: vColor, color: '#fff', fontSize: 11, fontWeight: 800, letterSpacing: '.03em' }}>{vLabel}</span>
        )}
        <span className="num tnum" style={{ fontSize: 12, color: 'var(--ink-2)' }}>
          {model.banked} + {summary.sumReq} = <b>{summary.projected}</b>{mode === 'target' ? ` → ${summary.target}` : ''}
        </span>
      </div>

      {/* rows */}
      <div style={{ padding: '12px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {summary.rows.map((row) => (
          <EventRowMobile
            key={row.event.id}
            row={row}
            disabled={rowDisabled(row.event.id)}
            onChange={(pts) => onChange(row.event.id, pts)}
            onLock={() => toggleLock(row.event.id)}
            showLock={showLock}
          />
        ))}
      </div>

      <Legend />
    </div>
  );
}

// ---------- Athlete switcher + back ----------
function TopBar({ athlete, athletes, onBack, onSwitchAthlete }: Omit<Props, 'competition'>) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', color: 'var(--muted)', fontSize: 13, fontWeight: 600, padding: 0, cursor: 'pointer' }}
      >
        ← Back to scoreboard
      </button>
      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <span className="micro" style={{ color: 'var(--muted-2)' }}>ATHLETE</span>
        <select
          value={athlete.id}
          onChange={(e) => onSwitchAthlete(e.target.value)}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--line)', background: '#fff', color: 'var(--ink)', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
        >
          {athletes.map((a) => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
      </label>
    </div>
  );
}

// ---------- Edge-state message ----------
function Notice({ title, body, onBack }: { title: string; body: string; onBack: () => void }) {
  return (
    <div style={{ ...cardStyle, padding: '32px 28px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 12 }}>
      <div style={{ width: 52, height: 52, borderRadius: 12, background: 'var(--bg-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: 'var(--muted)' }}>◎</div>
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 420 }}>{body}</div>
      <button onClick={onBack} style={{ marginTop: 4, padding: '9px 16px', borderRadius: 10, border: '1px solid var(--ink)', background: 'var(--ink)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>← Back to scoreboard</button>
    </div>
  );
}

export function TargetSplits({ competition, athlete, athletes, onBack, onSwitchAthlete }: Props) {
  const model = useMemo(() => buildTargetModel(competition, athlete), [competition, athlete]);
  const calc = useTargetCalc(model);

  let body: ReactNode;
  if (model.withdrawn) {
    body = <Notice title={`${athlete.name} has withdrawn`} body="Target splits are only meaningful for an athlete still competing." onBack={onBack} />;
  } else if (model.allDone) {
    body = <Notice title="All events complete" body={`${athlete.name} has finished every discipline — there are no remaining events left to plan.`} onBack={onBack} />;
  } else {
    body = (
      <>
        <div className="hidden md:block"><CalculatorDesktop model={model} calc={calc} /></div>
        <div className="md:hidden"><CalculatorMobile model={model} calc={calc} /></div>
      </>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <TopBar athlete={athlete} athletes={athletes} onBack={onBack} onSwitchAthlete={onSwitchAthlete} />
      {body}
    </div>
  );
}
