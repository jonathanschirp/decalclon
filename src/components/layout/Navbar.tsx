import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/athletes', label: 'Athletes' },
  { path: '/competitions', label: 'Competitions' },
];

export function Navbar() {
  const location = useLocation();
  const { user, signOut } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) =>
    path === '/'
      ? location.pathname === '/'
      : location.pathname.startsWith(path);

  return (
    <nav className="bg-slate-800 text-white shadow-lg">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center min-w-0">
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="text-base sm:text-lg font-bold tracking-tight truncate"
            >
              <span className="hidden sm:inline">Decathlon Predictor</span>
              <span className="sm:hidden">Decathlon</span>
            </Link>
            {/* Desktop nav */}
            <div className="hidden md:flex gap-1 ml-8">
              {navItems.map(({ path, label }) => (
                <Link
                  key={path}
                  to={path}
                  className={`px-3 py-2 rounded text-sm font-medium transition-colors ${
                    isActive(path)
                      ? 'bg-slate-700 text-white'
                      : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                  }`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop user info */}
          {user && (
            <div className="hidden md:flex items-center gap-3">
              <span className="text-xs text-slate-400 truncate max-w-[160px]">{user.email}</span>
              <button
                onClick={signOut}
                className="px-3 py-1.5 text-xs text-slate-300 hover:text-white hover:bg-slate-700 rounded transition-colors"
              >
                Sign out
              </button>
            </div>
          )}

          {/* Mobile hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen((o) => !o)}
            className="md:hidden inline-flex items-center justify-center p-2 rounded text-slate-300 hover:text-white hover:bg-slate-700"
            aria-label="Toggle navigation menu"
            aria-expanded={menuOpen}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {menuOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden border-t border-slate-700 py-2 space-y-1">
            {navItems.map(({ path, label }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2.5 rounded text-base font-medium ${
                  isActive(path)
                    ? 'bg-slate-700 text-white'
                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                }`}
              >
                {label}
              </Link>
            ))}
            {user && (
              <div className="pt-2 mt-2 border-t border-slate-700">
                <div className="px-3 py-1 text-xs text-slate-400 truncate">{user.email}</div>
                <button
                  onClick={() => {
                    setMenuOpen(false);
                    signOut();
                  }}
                  className="w-full text-left px-3 py-2.5 text-base text-slate-300 hover:text-white hover:bg-slate-700 rounded"
                >
                  Sign out
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
}
