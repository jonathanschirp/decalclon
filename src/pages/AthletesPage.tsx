import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { AthleteList } from '../components/athletes/AthleteList';

export function AthletesPage() {
  const { athletes, loading, fetch } = useAthletes();

  useEffect(() => {
    fetch();
  }, [fetch]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Athletes</h1>
        <Link
          to="/athletes/new"
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
        >
          Add Athlete
        </Link>
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : (
        <AthleteList athletes={athletes} />
      )}
    </div>
  );
}
