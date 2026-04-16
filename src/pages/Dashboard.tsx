import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAthletes } from '../hooks/useAthletes';
import { useCompetitions } from '../hooks/useCompetition';

export function Dashboard() {
  const { athletes, fetch: fetchAthletes } = useAthletes();
  const { competitions, fetch: fetchCompetitions } = useCompetitions();

  useEffect(() => {
    fetchAthletes();
    fetchCompetitions();
  }, [fetchAthletes, fetchCompetitions]);

  const activeComps = competitions.filter((c) => c.status === 'in_progress');
  const upcomingComps = competitions.filter((c) => c.status === 'upcoming');
  const completedComps = competitions.filter((c) => c.status === 'completed');

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold mb-2">Dashboard</h1>
        <p className="text-gray-500">Track multi-event athletics competitions with live predictions.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-3xl font-bold text-blue-600">{athletes.length}</div>
          <div className="text-sm text-gray-500 mt-1">Athletes</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-3xl font-bold text-yellow-600">{activeComps.length}</div>
          <div className="text-sm text-gray-500 mt-1">Active Competitions</div>
        </div>
        <div className="bg-white border border-gray-200 rounded-lg p-5">
          <div className="text-3xl font-bold text-green-600">{completedComps.length}</div>
          <div className="text-sm text-gray-500 mt-1">Completed</div>
        </div>
      </div>

      {activeComps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Active Competitions</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {activeComps.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="block p-4 bg-yellow-50 border border-yellow-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="font-semibold">{comp.name}</div>
                <div className="text-sm text-gray-500">
                  {comp.date} — {comp.athleteIds.length} athletes
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {upcomingComps.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-3">Upcoming</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingComps.map((comp) => (
              <Link
                key={comp.id}
                to={`/competitions/${comp.id}`}
                className="block p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
              >
                <div className="font-semibold">{comp.name}</div>
                <div className="text-sm text-gray-500">
                  {comp.date} — {comp.type} — {comp.athleteIds.length} athletes
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        <Link to="/athletes/new" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
          Add Athlete
        </Link>
        <Link to="/competitions/new" className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm">
          New Competition
        </Link>
      </div>
    </div>
  );
}
