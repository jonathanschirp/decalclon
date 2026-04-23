import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import type { Competition, CompetitionType, CompetitionResults } from '../../types';
import { useCompetitions } from '../../hooks/useCompetition';
import { useAthletes } from '../../hooks/useAthletes';
import { CompetitionSearch, type CompetitionImportData } from './CompetitionSearch';
import { fetchAthleteProfile, mapPersonalBests, extractCombinedPB } from '../../lib/worldathletics';
import { updateAthlete } from '../../lib/firebase';
import { getCompetitionStatus } from '../../lib/competitionStatus';

interface Props {
  competition?: Competition;
}

export function CompetitionForm({ competition }: Props) {
  const navigate = useNavigate();
  const { create, update } = useCompetitions();
  const { athletes, fetch: fetchAthletes } = useAthletes();
  const [name, setName] = useState(competition?.name ?? '');
  const [date, setDate] = useState(competition?.date ?? '');
  const [location, setLocation] = useState(competition?.location ?? '');
  const [type, setType] = useState<CompetitionType>(competition?.type ?? 'decathlon');
  const [selectedAthletes, setSelectedAthletes] = useState<string[]>(competition?.athleteIds ?? []);
  const [waCompetitionId, setWaCompetitionId] = useState<number | undefined>(competition?.waCompetitionId);
  const [waEventId, setWaEventId] = useState<number | undefined>(competition?.waEventId);
  const [waAthleteMap, setWaAthleteMap] = useState<Record<string, string>>(competition?.waAthleteMap ?? {});
  const [importedResults, setImportedResults] = useState<CompetitionResults | null>(null);
  const [imported, setImported] = useState(false);
  const [saving, setSaving] = useState(false);

  // Athlete search / filter
  const [athleteSearch, setAthleteSearch] = useState('');

  // PB reload state
  const [reloading, setReloading] = useState(false);
  const [reloadProgress, setReloadProgress] = useState('');

  useEffect(() => {
    fetchAthletes();
  }, [fetchAthletes]);

  const gender = type === 'decathlon' ? 'male' : 'female';

  const eligibleAthletes = useMemo(
    () => athletes.filter((a) => a.gender === gender),
    [athletes, gender],
  );

  const filterBySearch = useMemo(() => {
    const q = athleteSearch.toLowerCase().trim();
    if (!q) return eligibleAthletes;
    return eligibleAthletes.filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.nationality?.toLowerCase().includes(q),
    );
  }, [eligibleAthletes, athleteSearch]);

  const selectedSet = useMemo(() => new Set(selectedAthletes), [selectedAthletes]);

  const selectedList = useMemo(
    () => filterBySearch.filter((a) => selectedSet.has(a.id)),
    [filterBySearch, selectedSet],
  );
  const unselectedList = useMemo(
    () => filterBySearch.filter((a) => !selectedSet.has(a.id)),
    [filterBySearch, selectedSet],
  );

  const waLinkedCount = useMemo(
    () => eligibleAthletes.filter((a) => selectedSet.has(a.id) && a.waAthleteId).length,
    [eligibleAthletes, selectedSet],
  );

  // Remove stale IDs of deleted athletes once the athlete list has loaded
  useEffect(() => {
    if (athletes.length === 0) return;
    const validIds = new Set(athletes.map((a) => a.id));
    setSelectedAthletes((prev) => {
      const filtered = prev.filter((id) => validIds.has(id));
      return filtered.length === prev.length ? prev : filtered;
    });
  }, [athletes]);

  const toggleAthlete = (id: string) => {
    setSelectedAthletes((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const handleReloadPBs = async () => {
    const toReload = eligibleAthletes.filter(
      (a) => selectedSet.has(a.id) && a.waAthleteId,
    );
    if (toReload.length === 0) return;

    setReloading(true);
    try {
      for (let i = 0; i < toReload.length; i++) {
        const athlete = toReload[i];
        setReloadProgress(`${i + 1}/${toReload.length}: ${athlete.name}`);
        try {
          const profile = await fetchAthleteProfile(athlete.waAthleteId!);
          const pbs = mapPersonalBests(profile.personalBests, gender as 'male' | 'female');
          const combinedPB = extractCombinedPB(profile.personalBests, gender as 'male' | 'female');
          await updateAthlete(athlete.id, { personalBests: pbs, combinedPB });
        } catch {
          // Skip individual failures silently
        }
      }
      await fetchAthletes();
    } finally {
      setReloading(false);
      setReloadProgress('');
    }
  };

  const handleImport = (data: CompetitionImportData) => {
    setName(data.name);
    setDate(data.date);
    setLocation(data.location);
    setType(data.type);
    setSelectedAthletes(data.athleteIds);
    setWaCompetitionId(data.waCompetitionId);
    setWaEventId(data.waEventId);
    setWaAthleteMap(data.waAthleteMap);
    setImportedResults(data.results);
    setImported(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const status = getCompetitionStatus(date);
    try {
      if (competition) {
        await update(competition.id, {
          name, date, location, type, status,
          athleteIds: selectedAthletes,
          waCompetitionId,
          waEventId,
          waAthleteMap,
        });
        navigate(`/competitions/${competition.id}`);
      } else {
        const id = await create({
          name, date, location, type, status,
          athleteIds: selectedAthletes,
          results: importedResults ?? {},
          waCompetitionId,
          waEventId,
          waAthleteMap,
        });
        navigate(`/competitions/${id}`);
      }
    } finally {
      setSaving(false);
    }
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
          {!competition && (
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
                  IMPORTED · {selectedAthletes.length} ATHLETES
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
          placeholder={competition ? 'Competition name' : 'Search WA calendar...'}
          className="display"
          style={{
            width: '100%', border: 'none', outline: 'none',
            fontSize: 30, fontWeight: 700, letterSpacing: '-.02em',
            padding: '6px 0', color: 'var(--ink)', background: 'transparent',
          }}
        />

        {/* Progress underline */}
        {!competition && (
          <div style={{ marginTop: 10, height: 2, background: 'var(--line)', overflow: 'hidden', borderRadius: 2 }}>
            <div style={{
              height: '100%',
              width: imported ? '100%' : name.trim().length >= 2 ? '100%' : '0%',
              background: imported ? 'var(--pb)' : 'var(--ink)',
              transition: 'width .35s ease',
            }} />
          </div>
        )}

        {/* Search results / flow */}
        {!competition && (
          <CompetitionSearch
            query={name}
            disabled={imported}
            onImport={handleImport}
          />
        )}

        {/* Imported confirmation banner */}
        {imported && waCompetitionId && (
          <div style={{
            marginTop: 14, padding: '12px 14px',
            background: 'var(--pb-soft)', border: '1px solid #C2E5D0',
            borderRadius: 10,
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <div>
              <div style={{ fontWeight: 600, fontSize: 13 }}>
                <span style={{ color: 'var(--pb)' }}>{name}</span> imported · {selectedAthletes.length} athletes
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                Results will sync from World Athletics as they are published.
              </div>
            </div>
            <button
              type="button"
              onClick={() => { setImported(false); setWaCompetitionId(undefined); setWaEventId(undefined); }}
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
          {/* Start date */}
          <div>
            <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>START DATE</div>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mono tnum"
              style={ghostStyle(imported, true)}
            />
          </div>

          {/* Location */}
          <div>
            <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>LOCATION</div>
            <input
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="City, Country"
              style={ghostStyle(imported)}
            />
          </div>

          {/* Discipline toggle — hidden on edit since type can't change */}
          {!competition && (
            <div>
              <div className="micro" style={{ color: 'var(--muted-2)', marginBottom: 6 }}>DISCIPLINE</div>
              <div style={{ display: 'flex', background: 'var(--bg)', padding: 3, borderRadius: 8, border: '1px solid var(--line)' }}>
                {(['decathlon', 'heptathlon'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => { setType(t); setSelectedAthletes([]); }}
                    style={{
                      flex: 1, padding: '7px 0', fontSize: 12, fontWeight: 600,
                      background: type === t ? 'var(--ink)' : 'transparent',
                      color: type === t ? '#fff' : 'var(--muted)',
                      border: 'none', borderRadius: 6, cursor: 'pointer',
                      textTransform: 'capitalize',
                    }}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 03 · ATHLETES */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden',
      }}>
        <div style={{
          padding: '14px 20px', borderBottom: '1px solid var(--line)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          flexWrap: 'wrap', gap: 8,
        }}>
          <span className="micro" style={{ color: 'var(--muted-2)' }}>03 · ATHLETES</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
              <span className="tnum" style={{ color: 'var(--ink)', fontWeight: 700 }}>{selectedAthletes.length}</span> enrolled
              {waLinkedCount > 0 && (
                <span> · <span className="tnum" style={{ color: 'var(--pb)', fontWeight: 700 }}>{waLinkedCount}</span> linked to WA</span>
              )}
            </span>
            {waLinkedCount > 0 && (
              <button
                type="button"
                onClick={handleReloadPBs}
                disabled={reloading}
                style={{
                  padding: '6px 10px', fontSize: 11, fontWeight: 600,
                  background: '#fff', border: '1px solid var(--line)',
                  borderRadius: 6, cursor: 'pointer',
                  opacity: reloading ? 0.5 : 1,
                }}
              >
                {reloading ? 'Reloading...' : 'Reload PBs'}
              </button>
            )}
          </div>
        </div>

        {reloading && reloadProgress && (
          <div style={{
            padding: '8px 20px',
            borderBottom: '1px solid var(--line)',
            fontSize: 11, color: 'var(--muted)',
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <span className="live-dot" style={{ width: 6, height: 6, background: 'var(--muted)', borderRadius: 99 }} />
            {reloadProgress}
          </div>
        )}

        {/* Search bar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
          <input
            type="text"
            value={athleteSearch}
            onChange={(e) => setAthleteSearch(e.target.value)}
            placeholder="Filter athletes by name or nationality..."
            style={{
              width: '100%', padding: '8px 10px',
              border: '1px solid var(--line)', borderRadius: 6,
              background: '#fff', fontSize: 12, color: 'var(--ink)',
              outline: 'none',
            }}
          />
        </div>

        {eligibleAthletes.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center' }}>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>
              No {type === 'decathlon' ? 'male' : 'female'} athletes available. Add athletes first.
            </div>
          </div>
        ) : (
          <>
            {/* Selected athletes */}
            {selectedList.map((athlete, i) => (
              <label
                key={athlete.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '10px 14px',
                  borderBottom: '1px solid var(--line)',
                  cursor: 'pointer', background: '#fff',
                }}
              >
                <span className="num tnum hidden sm:inline" style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted-2)', width: 24, textAlign: 'center', flexShrink: 0 }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <input
                  type="checkbox"
                  checked
                  onChange={() => toggleAthlete(athlete.id)}
                  style={{ accentColor: 'var(--ink)', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {athlete.name}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                    {athlete.nationality}{athlete.waAthleteId ? ' · WA-linked' : ''}
                  </div>
                </div>
                {athlete.combinedPB != null && (
                  <span className="num tnum" style={{ fontSize: 15, fontWeight: 700, flexShrink: 0 }}>
                    {athlete.combinedPB}
                  </span>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); toggleAthlete(athlete.id); }}
                  className="hidden sm:inline"
                  style={{
                    padding: '4px 8px', fontSize: 11, fontWeight: 600,
                    color: 'var(--muted)', background: 'transparent',
                    border: 'none', cursor: 'pointer', flexShrink: 0,
                  }}
                >
                  Remove
                </button>
              </label>
            ))}

            {/* Divider */}
            {selectedList.length > 0 && unselectedList.length > 0 && (
              <div style={{ borderTop: '2px solid var(--line-2)' }} />
            )}

            {/* Unselected athletes */}
            <div style={{ maxHeight: 200, overflowY: 'auto' }}>
              {unselectedList.map((athlete) => (
                <label
                  key={athlete.id}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '10px 14px',
                    borderBottom: '1px solid var(--line)',
                    cursor: 'pointer', background: 'transparent',
                    opacity: 0.7,
                  }}
                >
                  <span className="hidden sm:inline" style={{ width: 24, flexShrink: 0 }} />
                  <input
                    type="checkbox"
                    checked={false}
                    onChange={() => toggleAthlete(athlete.id)}
                    style={{ accentColor: 'var(--ink)', flexShrink: 0 }}
                  />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{athlete.name}</div>
                    <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 1 }}>
                      {athlete.nationality}
                    </div>
                  </div>
                  {athlete.combinedPB != null && (
                    <span className="num tnum" style={{ fontSize: 13, color: 'var(--muted)', flexShrink: 0 }}>{athlete.combinedPB}</span>
                  )}
                </label>
              ))}
            </div>

            {filterBySearch.length === 0 && athleteSearch.trim() && (
              <div style={{ padding: '20px', textAlign: 'center', fontSize: 12, color: 'var(--muted)' }}>
                No athletes match &ldquo;{athleteSearch}&rdquo;
              </div>
            )}
          </>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
          {imported && waCompetitionId
            ? <>Linked to WA competition · results will sync automatically.</>
            : <>No WA link — you can still save manually.</>
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
            disabled={saving || !name.trim() || !date}
            style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 600,
              border: '1px solid var(--ink)', background: 'var(--ink)',
              color: '#fff', borderRadius: 8, cursor: 'pointer',
              opacity: saving || !name.trim() || !date ? 0.5 : 1,
            }}
          >
            {saving ? 'Saving...' : competition ? 'Update competition' : 'Create competition'}
          </button>
        </div>
      </div>
    </form>
  );
}
