import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import Select from 'react-select';
import type { Athlete, Gender } from '../../types';
import { getEventsForType } from '../../lib/events';
import { calculatePoints, parseTimeInput, formatTime } from '../../lib/scoring';
import { useAthletes } from '../../hooks/useAthletes';
import { AthleteSearch } from './AthleteSearch';
import { COUNTRIES } from '../../lib/countries';
import type { EventDefinition } from '../../types';

interface Props {
  athlete?: Athlete;
}

const countryOptions = COUNTRIES.map((c) => ({ value: c, label: c }));

const LONG_TRACK_IDS = new Set(['dec_400m', 'dec_1500m', 'hep_800m']);

function filterPerformanceInput(value: string, event: EventDefinition): string {
  if (event.type === 'field') {
    let filtered = '';
    let hasDot = false;
    let decimals = 0;
    for (const ch of value) {
      if (ch >= '0' && ch <= '9') {
        if (hasDot) { if (decimals < 2) { filtered += ch; decimals++; } } else { filtered += ch; }
      } else if (ch === '.' && !hasDot) { filtered += ch; hasDot = true; }
    }
    return filtered;
  }
  const isLong = LONG_TRACK_IDS.has(event.id);
  let filtered = '';
  let hasDot = false;
  let hasColon = false;
  let decimals = 0;
  for (const ch of value) {
    if (ch >= '0' && ch <= '9') {
      if (hasDot) { if (decimals < 2) { filtered += ch; decimals++; } } else { filtered += ch; }
    } else if (ch === '.' && !hasDot) { filtered += ch; hasDot = true; }
    else if (ch === ':' && isLong && !hasColon && !hasDot) { filtered += ch; hasColon = true; }
  }
  return filtered;
}

export function AthleteForm({ athlete }: Props) {
  const navigate = useNavigate();
  const { create, update } = useAthletes();
  const [name, setName] = useState(athlete?.name ?? '');
  const [gender, setGender] = useState<Gender>(athlete?.gender ?? 'male');
  const [nationality, setNationality] = useState(athlete?.nationality ?? '');
  const [personalBests, setPersonalBests] = useState<Record<string, string>>(
    athlete
      ? Object.fromEntries(
          Object.entries(athlete.personalBests).map(([k, v]) => {
            const events = getEventsForType(athlete.gender === 'male' ? 'decathlon' : 'heptathlon');
            const ev = events.find((e) => e.id === k);
            return [k, ev?.type === 'track' ? formatTime(v) : String(v)];
          }),
        )
      : {},
  );
  const [combinedPB, setCombinedPB] = useState(athlete?.combinedPB != null ? String(athlete.combinedPB) : '');
  const [waAthleteId, setWaAthleteId] = useState<string | undefined>(athlete?.waAthleteId);
  const [imported, setImported] = useState(false);
  const [saving, setSaving] = useState(false);

  const events = getEventsForType(gender === 'male' ? 'decathlon' : 'heptathlon');

  const selectedCountry = useMemo(
    () => countryOptions.find((o) => o.value === nationality) ?? (nationality ? { value: nationality, label: nationality } : null),
    [nationality],
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const pbs: Record<string, number> = {};
    for (const [eventId, val] of Object.entries(personalBests)) {
      if (!val.trim()) continue;
      const event = events.find((ev) => ev.id === eventId);
      if (!event) continue;
      const parsed = event.type === 'track' ? parseTimeInput(val) : parseFloat(val);
      if (parsed != null && parsed > 0) pbs[eventId] = parsed;
    }
    const parsedCombinedPB = combinedPB.trim() ? parseInt(combinedPB, 10) : undefined;
    try {
      if (athlete) {
        await update(athlete.id, { name, gender, nationality, personalBests: pbs, combinedPB: parsedCombinedPB, waAthleteId });
        navigate(`/athletes/${athlete.id}`);
      } else {
        const id = await create({ name, gender, nationality, personalBests: pbs, combinedPB: parsedCombinedPB, waAthleteId });
        navigate(`/athletes/${id}`);
      }
    } finally {
      setSaving(false);
    }
  };

  const getPoints = (eventId: string): number | null => {
    const val = personalBests[eventId];
    if (!val?.trim()) return null;
    const event = events.find((ev) => ev.id === eventId);
    if (!event) return null;
    const parsed = event.type === 'track' ? parseTimeInput(val) : parseFloat(val);
    if (parsed == null || parsed <= 0) return null;
    return calculatePoints(event, parsed);
  };

  const totalPoints = events.reduce((sum, e) => sum + (getPoints(e.id) ?? 0), 0);

  const placeholder = (event: EventDefinition) => {
    if (event.type === 'field') return 'e.g. 7.65';
    if (LONG_TRACK_IDS.has(event.id)) return 'e.g. 4:11.30';
    return 'e.g. 10.85';
  };

  const ghostStyle = (isGhost: boolean, mono?: boolean): React.CSSProperties => ({
    width: '100%', padding: '9px 10px',
    border: `1px solid ${isGhost ? '#C2E5D0' : 'var(--line)'}`,
    background: isGhost ? 'var(--pb-soft)' : '#fff',
    borderRadius: 6, fontSize: 13, color: 'var(--ink)',
    fontFamily: mono ? "'JetBrains Mono', monospace" : 'inherit',
    outline: 'none',
  });

  return (
    <form onSubmit={handleSubmit} className="max-w-[900px]" style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
      {/* 01 · NAME — the search hero */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
        padding: 20, position: 'relative',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <span className="micro" style={{ color: 'var(--muted-2)' }}>01 · NAME</span>
          {!athlete && (
            <>
              {name.trim().length < 2 ? (
                <span className="micro" style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--muted)',
                }}>Type 2+ characters</span>
              ) : imported ? (
                <span className="micro" style={{
                  padding: '3px 10px', borderRadius: 6,
                  background: 'var(--pb-soft)', border: '1px solid #C2E5D0', color: 'var(--pb)', fontWeight: 700,
                  display: 'flex', alignItems: 'center', gap: 4,
                }}>
                  <span style={{ width: 5, height: 5, borderRadius: 99, background: 'var(--pb)' }} />
                  IMPORTED FROM WA
                </span>
              ) : null}
            </>
          )}
        </div>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => { setName(e.target.value); setImported(false); }}
          placeholder={athlete ? 'Athlete name' : 'Search World Athletics...'}
          className="display"
          style={{
            width: '100%', border: 'none', outline: 'none',
            fontSize: 30, fontWeight: 700, letterSpacing: '-.02em',
            padding: '6px 0', color: 'var(--ink)', background: 'transparent',
          }}
        />

        {/* Progress underline */}
        {!athlete && (
          <div style={{ marginTop: 10, height: 2, background: 'var(--line)', overflow: 'hidden', borderRadius: 2 }}>
            <div style={{
              height: '100%',
              width: imported ? '100%' : name.trim().length >= 2 ? '100%' : '0%',
              background: imported ? 'var(--pb)' : 'var(--ink)',
              transition: 'width .35s ease',
            }} />
          </div>
        )}

        {/* Search results dropdown */}
        {!athlete && (
          <AthleteSearch
            query={name}
            disabled={imported}
            onImport={(data) => {
              setName(data.name);
              setNationality(data.nationality);
              setGender(data.gender);
              setWaAthleteId(data.waAthleteId);
              setImported(true);
              if (data.combinedPB != null) setCombinedPB(String(data.combinedPB));
              const evts = getEventsForType(data.gender === 'male' ? 'decathlon' : 'heptathlon');
              const pbStrings: Record<string, string> = {};
              for (const ev of evts) {
                const val = data.personalBests[ev.id];
                if (val != null) {
                  pbStrings[ev.id] = ev.type === 'track' ? formatTime(val) : String(val);
                }
              }
              setPersonalBests(pbStrings);
            }}
          />
        )}

        {/* Imported confirmation banner */}
        {imported && waAthleteId && (
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'var(--pb-soft)', border: '1px solid #C2E5D0',
            borderRadius: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {nationality && (
                <span className="mono" style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)' }}>{nationality}</span>
              )}
              <div>
                <div style={{ fontWeight: 600, fontSize: 13 }}>
                  Linked to <span style={{ color: 'var(--pb)' }}>{name}</span> ·{' '}
                  <span className="mono" style={{ fontSize: 10 }}>WA {waAthleteId}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}>
                  Personal bests + combined PB imported · editable below
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setImported(false); setWaAthleteId(undefined); }}
              style={{
                padding: '6px 10px', fontSize: 12, fontWeight: 600,
                background: '#fff', border: '1px solid var(--line)',
                borderRadius: 6, cursor: 'pointer',
              }}
            >
              Unlink
            </button>
          </div>
        )}
      </div>

      {/* 02 · DETAILS */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, padding: 20,
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <span className="micro" style={{ color: 'var(--muted-2)' }}>02 · DETAILS</span>
          {imported && <span className="micro" style={{ color: 'var(--pb)', fontWeight: 700 }}>AUTO-FILLED</span>}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* Discipline toggle */}
          <div>
            <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>DISCIPLINE</div>
            <div style={{ display: 'flex', background: 'var(--bg)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
              {(['male', 'female'] as const).map((g) => (
                <button
                  key={g}
                  type="button"
                  onClick={() => { if (!athlete) { setGender(g); setPersonalBests({}); } }}
                  disabled={!!athlete}
                  style={{
                    flex: 1, padding: '8px 0', fontSize: 13, fontWeight: 600,
                    background: gender === g ? 'var(--ink)' : 'transparent',
                    color: gender === g ? '#fff' : 'var(--muted)',
                    border: 'none', borderRadius: 6, cursor: athlete ? 'default' : 'pointer',
                  }}
                >
                  {g === 'male' ? 'Decathlon' : 'Heptathlon'}
                </button>
              ))}
            </div>
          </div>

          {/* Nationality */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="micro" style={{ color: 'var(--muted-2)' }}>NATIONALITY</span>
            </div>
            <Select
              options={countryOptions}
              value={selectedCountry}
              onChange={(opt) => setNationality(opt?.value ?? '')}
              isClearable
              placeholder="Search country..."
              styles={{
                control: (base) => ({
                  ...base,
                  minHeight: 38,
                  borderColor: imported ? '#C2E5D0' : 'var(--line)',
                  backgroundColor: imported ? 'var(--pb-soft)' : '#fff',
                  borderRadius: 6, boxShadow: 'none', fontSize: 13,
                }),
                menu: (base) => ({ ...base, zIndex: 20, borderColor: 'var(--line)' }),
                option: (base, state) => ({
                  ...base,
                  fontSize: 13,
                  backgroundColor: state.isSelected ? 'var(--ink)' : state.isFocused ? 'var(--bg)' : '#fff',
                  color: state.isSelected ? '#fff' : 'var(--ink)',
                }),
                singleValue: (base) => ({ ...base, color: 'var(--ink)' }),
                input: (base) => ({ ...base, color: 'var(--ink)' }),
                placeholder: (base) => ({ ...base, color: 'var(--muted-2)' }),
              }}
            />
          </div>

          {/* Combined PB */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <span className="micro" style={{ color: 'var(--muted-2)' }}>
                {gender === 'male' ? 'DECATHLON' : 'HEPTATHLON'} PB
              </span>
              {imported && <span style={{ fontSize: 10, color: 'var(--pb)', fontWeight: 700 }}>AUTO</span>}
            </div>
            <input
              type="text"
              inputMode="numeric"
              value={combinedPB}
              onChange={(e) => setCombinedPB(e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 9126"
              className="mono tnum"
              style={ghostStyle(imported, true)}
            />
          </div>
        </div>
      </div>

      {/* 03 · PERSONAL BESTS */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span className="micro" style={{ color: 'var(--muted-2)' }}>03 · PERSONAL BESTS</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>Sum:</span>
            <span className="num tnum" style={{ fontSize: 18, fontWeight: 800 }}>
              {totalPoints > 0 ? totalPoints : '—'}
            </span>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>pts</span>
          </div>
        </div>

        {/* Header — desktop */}
        <div className="hidden sm:grid" style={{
          gridTemplateColumns: '60px 1.2fr 1fr 100px 1fr',
          padding: '8px 20px', background: 'var(--bg)', borderBottom: '1px solid var(--line)',
        }}>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>#</div>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>EVENT</div>
          <div className="micro" style={{ color: 'var(--muted-2)' }}>PERSONAL BEST</div>
          <div className="micro" style={{ color: 'var(--muted-2)', textAlign: 'right' }}>POINTS</div>
          <div className="micro" style={{ color: 'var(--muted-2)', paddingLeft: 14 }}>STRENGTH · / 1100</div>
        </div>

        {events.map((event, i) => {
          const pts = getPoints(event.id);
          return (
            <div key={event.id} style={{
              borderBottom: i < events.length - 1 ? '1px solid var(--line)' : 'none',
            }}>
              {/* Desktop row */}
              <div className="hidden sm:grid" style={{
                gridTemplateColumns: '60px 1.2fr 1fr 100px 1fr',
                padding: '10px 20px', alignItems: 'center',
                gap: 12,
              }}>
                <div className="num tnum" style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)' }}>
                  {String(event.order).padStart(2, '0')}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{event.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {event.type === 'track' ? (LONG_TRACK_IDS.has(event.id) ? 'm:ss.xx' : 'seconds') : 'meters'}
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={personalBests[event.id] ?? ''}
                  onChange={(e) => {
                    const filtered = filterPerformanceInput(e.target.value, event);
                    setPersonalBests((prev) => ({ ...prev, [event.id]: filtered }));
                  }}
                  placeholder={placeholder(event)}
                  className="mono tnum"
                  style={ghostStyle(imported && personalBests[event.id] != null, true)}
                />
                <div className="num tnum" style={{
                  textAlign: 'right', fontSize: 15, fontWeight: 700,
                  color: pts ? 'var(--ink)' : 'var(--muted-2)',
                }}>
                  {pts ?? '—'}
                </div>
                <div style={{ paddingLeft: 14 }}>
                  <div style={{ height: 4, background: 'var(--bg-2)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%',
                      width: `${Math.min(100, ((pts ?? 0) / 1100) * 100)}%`,
                      background: (pts ?? 0) >= 950 ? 'var(--pb)' : 'var(--ink)',
                    }} />
                  </div>
                </div>
              </div>

              {/* Mobile row */}
              <div className="flex sm:hidden" style={{
                alignItems: 'center', gap: 10,
                padding: '10px 14px',
              }}>
                <div className="num tnum" style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted-2)', width: 22, flexShrink: 0, textAlign: 'center' }}>
                  {String(event.order).padStart(2, '0')}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600 }}>{event.name}</div>
                  <div style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {pts != null ? `${pts} pts` : event.type === 'track' ? 'seconds' : 'meters'}
                  </div>
                </div>
                <input
                  type="text"
                  inputMode="decimal"
                  value={personalBests[event.id] ?? ''}
                  onChange={(e) => {
                    const filtered = filterPerformanceInput(e.target.value, event);
                    setPersonalBests((prev) => ({ ...prev, [event.id]: filtered }));
                  }}
                  placeholder={placeholder(event)}
                  className="mono tnum"
                  style={{ ...ghostStyle(imported && personalBests[event.id] != null, true), textAlign: 'right', padding: '8px 10px', fontSize: 13, width: 110, flexShrink: 0 }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {imported && waAthleteId
            ? <>Linked to <span className="mono">WA {waAthleteId}</span> · sync with the athletes screen to refresh later.</>
            : <>No World Athletics link — you can still save manually.</>
          }
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              border: '1px solid var(--line)', background: 'var(--surface)',
              color: 'var(--ink)', borderRadius: 8, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving || !name.trim()}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              border: '1px solid var(--ink)', background: 'var(--ink)',
              color: '#fff', borderRadius: 8, cursor: 'pointer',
              opacity: saving || !name.trim() ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : athlete ? 'Update athlete' : 'Create athlete'}
          </button>
        </div>
      </div>
    </form>
  );
}
