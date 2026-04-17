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
        <h1 className="text-2xl font-bold mb-6">New Athlete</h1>
        <AthleteForm />
      </div>
    );
  }

  const athlete = athletes.find((a) => a.id === id);

  if (!loaded) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Loading...</div>;
  if (!athlete) return <div className="text-center py-12 text-gray-500 dark:text-gray-400">Athlete not found.</div>;

  if (isEdit) {
    return (
      <div>
        <h1 className="text-2xl font-bold mb-6">Edit Athlete</h1>
        <AthleteForm athlete={athlete} />
      </div>
    );
  }

  return (
    <AthleteProfile
      athlete={athlete}
      onDelete={async () => {
        if (confirm('Delete this athlete?')) {
          await remove(athlete.id);
          navigate('/athletes');
        }
      }}
    />
  );
}
