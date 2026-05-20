import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function AuthCallback() {
  const navigate = useNavigate();
  const { setUser } = useAuth();
  const hasProcessed = useRef(false);

  useEffect(() => {
    if (hasProcessed.current) return;
    hasProcessed.current = true;
    const hash = window.location.hash || '';
    const params = new URLSearchParams(hash.replace(/^#/, ''));
    const sessionId = params.get('session_id');
    if (!sessionId) {
      navigate('/login', { replace: true });
      return;
    }
    (async () => {
      try {
        const res = await api.post('/auth/session', { session_id: sessionId });
        setUser(res.data);
        // Strip hash and redirect
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/dashboard', { replace: true });
      } catch (e) {
        navigate('/login?error=auth', { replace: true });
      }
    })();
  }, [navigate, setUser]);

  return (
    <div className="min-h-screen flex items-center justify-center text-[#52525B] text-sm font-mono-tight" data-testid="auth-callback">
      Establishing session…
    </div>
  );
}
