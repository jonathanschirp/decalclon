import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Logo } from '../common/Logo';

const navItems = [
  { path: '/', label: 'Competitions', num: '01' },
  { path: '/athletes', label: 'Athletes', num: '02' },
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
    <nav style={{ background: 'var(--surface)', borderBottom: '1px solid var(--line)' }}>
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-14">
          <div className="flex items-center min-w-0">
            {/* Logo */}
            <Link
              to="/"
              onClick={() => setMenuOpen(false)}
              className="flex items-center"
              style={{ color: 'var(--ink)' }}
            >
              <Logo height={34} />
            </Link>

            {/* Desktop nav */}
            <div className="hidden md:flex gap-0.5 ml-8">
              {navItems.map(({ path, label, num }) => (
                <Link
                  key={path}
                  to={path}
                  className="flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors"
                  style={{
                    fontWeight: isActive(path) ? 600 : 500,
                    color: isActive(path) ? 'var(--ink)' : 'var(--muted)',
                    background: isActive(path) ? 'var(--bg)' : 'transparent',
                  }}
                >
                  <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-2)' }}>{num}</span>
                  <span>{label}</span>
                </Link>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Desktop user info */}
            {user && (
              <div className="hidden md:flex items-center gap-3">
                <span className="mono truncate max-w-[160px]" style={{ fontSize: 11, color: 'var(--muted-2)' }}>{user.email}</span>
                <button
                  onClick={signOut}
                  className="px-3 py-1.5 rounded-md text-xs transition-colors"
                  style={{ color: 'var(--muted)', fontWeight: 500 }}
                >
                  Sign out
                </button>
              </div>
            )}

            {/* Mobile hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen((o) => !o)}
              className="md:hidden inline-flex items-center justify-center p-2 rounded-md"
              style={{ color: 'var(--muted)' }}
              aria-label="Toggle navigation menu"
              aria-expanded={menuOpen}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {menuOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile drawer */}
        {menuOpen && (
          <div className="md:hidden py-2 space-y-1" style={{ borderTop: '1px solid var(--line)' }}>
            {navItems.map(({ path, label, num }) => (
              <Link
                key={path}
                to={path}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-md text-base"
                style={{
                  fontWeight: isActive(path) ? 600 : 500,
                  color: isActive(path) ? 'var(--ink)' : 'var(--muted)',
                  background: isActive(path) ? 'var(--bg)' : 'transparent',
                }}
              >
                <span className="mono" style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted-2)' }}>{num}</span>
                <span>{label}</span>
              </Link>
            ))}
            {user && (
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid var(--line)' }}>
                <div className="mono px-3 py-1 truncate" style={{ fontSize: 11, color: 'var(--muted-2)' }}>{user.email}</div>
                <button
                  onClick={() => { setMenuOpen(false); signOut(); }}
                  className="w-full text-left px-3 py-2.5 rounded-md text-base"
                  style={{ color: 'var(--muted)' }}
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
