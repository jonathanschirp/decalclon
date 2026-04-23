import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useTheme } from '../hooks/useTheme';

export function LoginPage() {
  const { signIn, error } = useAuth();
  const { init } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { init(); }, [init]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await signIn(email, password);
    } catch {
      // error is set in the store
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4" style={{ background: 'var(--bg)' }}>
      <div className="w-full max-w-sm">
        <div className="flex items-center justify-center gap-3 mb-8">
          <div
            className="flex items-center justify-center"
            style={{
              width: 32, height: 32, borderRadius: 8,
              background: 'var(--ink)', color: '#fff',
              fontSize: 14, fontWeight: 800,
            }}
          >
            D
          </div>
          <h1 className="display" style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em', color: 'var(--ink)' }}>
            Decalclon
          </h1>
        </div>
        <form
          onSubmit={handleSubmit}
          className="space-y-4"
          style={{
            background: 'var(--surface)', border: '1px solid var(--line)',
            borderRadius: 12, padding: 24,
          }}
        >
          <div>
            <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--surface)', border: '1px solid var(--line)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--ink-2)' }}>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full px-3 py-2 rounded-lg text-sm"
              style={{
                background: 'var(--surface)', border: '1px solid var(--line)',
                color: 'var(--ink)', outline: 'none',
              }}
            />
          </div>
          {error && <p className="text-sm" style={{ color: 'var(--live)' }}>{error}</p>}
          <button
            type="submit"
            disabled={submitting}
            className="w-full px-4 py-2.5 rounded-lg font-medium text-sm disabled:opacity-50 transition-colors"
            style={{ background: 'var(--ink)', color: '#fff' }}
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  );
}
