import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { AthleteProfile } from '../components/athletes/AthleteProfile';
import { AthleteForm } from '../components/athletes/AthleteForm';

export function AthleteDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isNew = id === 'new';
  const isEdit = searchParams.get('edit') === 'true';
  const { athletes, fetch, remove } = useAthletes();
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    fetch().then(() => setLoaded(true));
  }, [fetch]);

  if (isNew) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 24 }}>
          New Athlete
        </h1>
        <AthleteForm />
      </div>
    );
  }

  const athlete = athletes.find((a) => a.id === id);

  if (!loaded) return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Loading...</div>;
  if (!athlete) return <div className="text-center py-12" style={{ color: 'var(--muted)' }}>Athlete not found.</div>;

  if (isEdit) {
    return (
      <div>
        <h1 className="display" style={{ fontSize: 28, fontWeight: 700, letterSpacing: '-.02em', marginBottom: 24 }}>
          Edit Athlete
        </h1>
        <AthleteForm athlete={athlete} />
      </div>
    );
  }

  const peers = athletes.filter((a) => a.gender === athlete.gender && a.id !== athlete.id);

  return (
    <AthleteProfile
      athlete={athlete}
      peers={peers}
      onDelete={async () => {
        if (confirm('Delete this athlete?')) {
          await remove(athlete.id);
          navigate('/athletes');
        }
      }}
    />
  );
}
