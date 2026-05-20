import { useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

export default function Login() {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true });
  }, [user, navigate]);

  return (
    <div className="min-h-[80vh] flex items-center justify-center px-6" data-testid="login-page">
      <div className="vela-card p-10 max-w-md w-full">
        <div className="kicker">Sign in</div>
        <h1 className="font-display text-3xl md:text-4xl font-medium tracking-tight mt-3 leading-tight">
          Continue to Propul8.
        </h1>
        <p className="text-[#52525B] mt-4 leading-relaxed font-light text-sm">
          Sign in to analyze new assets, upload property photos and floor plans,
          and access your dashboard history. The sample property is open to all.
        </p>
        <button
          onClick={login}
          data-testid="login-google-btn"
          className="vela-btn mt-8 w-full justify-center"
        >
          Sign in with Google <ArrowUpRight size={14} strokeWidth={1.6} />
        </button>
        <div className="text-[10px] text-[#52525B] mt-6 font-mono-tight">
          By continuing you agree to Propul8's terms. No spam — your assets are private.
        </div>
      </div>
    </div>
  );
}
