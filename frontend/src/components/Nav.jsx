import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ArrowUpRight, Menu, X } from 'lucide-react';
import { Logomark } from './Logomark';

// ──────────────────────────────────────────────────────────────────────────
// Propul8 Nav — institutional simplicity.
// LEFT  : Logo
// CENTER: Dashboard · Portfolio · Invest · Operate · Reports
// RIGHT : Demo
// Theme flips parchment ↔ dark when shell flips. Sticky on scroll.
// ──────────────────────────────────────────────────────────────────────────

const CENTER_LINKS = [
  { to: '/invest',          label: 'Invest'        },
  { to: '/operate',         label: 'Operate'       },
  { to: '/portfolio/demo',  label: 'Portfolio'     },
  { to: '/market-trends',   label: 'Market Trends' },
  { to: '/pricing',         label: 'Pricing'       },
];

const RIGHT_LINKS = [];

export default function Nav() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const isInvest = location.pathname.startsWith('/invest');
  const isPricing = location.pathname.startsWith('/pricing');
  // Pricing was rebuilt as a light architect-minimal shell to match the
  // rest of the app — no surface uses the dark Bloomberg shell anymore.
  const isDarkShell = false;

  // Close mobile menu on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  // Lock body scroll while the mobile panel is open so users can't
  // accidentally scroll the page beneath on touch devices.
  useEffect(() => {
    if (mobileOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
    return undefined;
  }, [mobileOpen]);

  // Auth-aware adjustments — authed users go to private routes.
  const adjustLink = (l) => {
    if (!user) return l;
    if (l.label === 'Portfolio') return { ...l, to: '/portfolio' };
    if (l.label === 'Market Trends') return { ...l, to: '/market-trends' };
    return l;
  };
  const center = CENTER_LINKS.map(adjustLink);
  const right  = RIGHT_LINKS.map(adjustLink);

  const isActiveLink = (to, label) => {
    if (label === 'Invest') return location.pathname.startsWith('/invest');
    if (label === 'Operate') return location.pathname.startsWith('/operate');
    if (label === 'Market Trends') return location.pathname.startsWith('/market-trends') || location.pathname.startsWith('/dashboard');
    if (label === 'Portfolio') return location.pathname.startsWith('/portfolio');
    if (label === 'Reports') return location.pathname.startsWith('/reports');
    if (label === 'Pricing') return location.pathname.startsWith('/pricing');
    return location.pathname === to;
  };

  // Theme tokens — light shell everywhere except /pricing which uses a
  // premium dark shell.
  const wrapClass = isDarkShell
    ? 'sticky top-0 z-50 backdrop-blur-2xl bg-[rgba(10,11,15,0.78)] border-b border-[rgba(255,255,255,0.08)]'
    : 'sticky top-0 z-50 backdrop-blur-2xl bg-[rgba(250,250,250,0.85)] border-b border-[rgba(9,9,11,0.06)]';
  const logoClass = isDarkShell
    ? 'font-display text-xl tracking-tight font-medium text-[#F2EFE8]'
    : 'font-display text-xl tracking-tight font-medium text-[#09090B]';
  const dotClass = isDarkShell ? 'text-[#9CC4A6] font-light' : 'text-[#B8956A] font-light';
  const inactive = isDarkShell ? 'text-[#8E8A82]' : 'text-[#52525B]';
  const active   = isDarkShell ? 'text-[#F2EFE8]' : 'text-[#09090B]';
  const hoverCls = isDarkShell ? 'nav-link-dark' : 'nav-link-light';

  return (
    <>
      <header data-testid="propul8-nav" className={wrapClass}>
        <div className="max-w-[1400px] mx-auto px-6 md:px-12 h-16 flex items-center justify-between gap-6">
          {/* LEFT — logo */}
          <Link to="/" data-testid="nav-logo" className={`${logoClass} inline-flex items-center gap-2`}>
            <Logomark size={22} color="#B8956A" dot="#B8956A" />
            <span>
              Propul8<span className={dotClass}>.</span>
            </span>
          </Link>

          {/* CENTER — 4 core links (desktop) */}
          <nav className="hidden md:flex items-center gap-1 flex-1 justify-center">
            {center.map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                data-testid={`nav-${l.label.toLowerCase()}`}
                className={`px-3.5 py-2 text-[12.5px] font-medium tracking-[0.01em] transition-colors ${hoverCls} ${
                  isActiveLink(l.to, l.label) ? active : inactive
                }`}
              >
                {l.label}
              </NavLink>
            ))}
          </nav>

          {/* RIGHT — Pricing + Enter Propul8 (desktop) */}
          <div className="flex items-center gap-3">
            <div className="hidden md:flex items-center gap-1">
              {right.map((l) => (
                <NavLink
                  key={l.label}
                  to={l.to}
                  data-testid={`nav-${l.label.toLowerCase()}`}
                  className={`px-3.5 py-2 text-[12.5px] font-medium tracking-[0.01em] transition-colors ${hoverCls} ${
                    isActiveLink(l.to, l.label) ? active : inactive
                  }`}
                >
                  {l.label}
                </NavLink>
              ))}
            </div>

            {user && (
              <span
                className="hidden lg:block text-xs"
                data-testid="nav-user-email"
                style={{ color: '#52525B' }}
              >
                {user.email}
              </span>
            )}

            <button
              onClick={() => navigate('/enter')}
              data-testid="nav-demo-btn"
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 text-[12px] font-medium transition-all"
              style={{
                fontFamily: 'Inter, sans-serif',
                borderRadius: 999,
                background: '#B8956A',
                color: '#FFFFFF',
                letterSpacing: '-0.005em',
                boxShadow: '0 1px 2px rgba(184,149,106,0.10)',
              }}
            >
              Demo
              <ArrowUpRight size={12} strokeWidth={1.8} />
            </button>

            {!user && (
              <button
                onClick={login}
                data-testid="nav-login-btn"
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium tracking-[0.06em] uppercase transition-colors"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  color: isDarkShell ? '#52525B' : '#52525B',
                }}
              >
                Sign in
              </button>
            )}

            {/* Mobile menu trigger */}
            <button
              onClick={() => setMobileOpen((o) => !o)}
              data-testid="nav-mobile-trigger"
              className="md:hidden inline-flex items-center justify-center w-10 h-10 transition-colors"
              style={{ color: isDarkShell ? '#FAFAFA' : '#09090B' }}
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>
      </header>

      {/* MOBILE PANEL */}
      {mobileOpen && (
        <div
          data-testid="nav-mobile-panel"
          className="md:hidden fixed inset-0 top-16 z-40"
          style={{
            background: isDarkShell ? '#FAFAFA' : '#FAFAFA',
            color: isDarkShell ? '#FAFAFA' : '#09090B',
          }}
        >
          <div className="flex flex-col h-full px-6 py-10 gap-1">
            {[...center, ...right].map((l) => (
              <NavLink
                key={l.label}
                to={l.to}
                data-testid={`mobile-nav-${l.label.toLowerCase()}`}
                onClick={() => setMobileOpen(false)}
                className={`py-4 text-2xl font-display font-medium border-b transition-colors ${
                  isActiveLink(l.to, l.label) ? active : inactive
                }`}
                style={{
                  borderColor: isInvest
                    ? 'rgba(196,167,137,0.10)'
                    : 'rgba(9,9,11,0.10)',
                }}
              >
                {l.label}
              </NavLink>
            ))}

            <button
              onClick={() => {
                navigate('/invest');
                setMobileOpen(false);
              }}
              data-testid="mobile-nav-enter-vela"
              className="mt-10 inline-flex items-center justify-between w-full px-5 py-4 text-[13px]"
              style={{
                fontFamily: 'Inter, sans-serif',
                borderRadius: 3,
                background: '#B8956A',
                color: '#FFFFFF',
                fontWeight: 500,
              }}
            >
              Enter Propul8
              <ArrowUpRight size={14} />
            </button>

            {!user && (
              <button
                onClick={() => {
                  login();
                  setMobileOpen(false);
                }}
                data-testid="mobile-nav-sign-in"
                className="mt-3 inline-flex items-center justify-center w-full px-5 py-4 text-[13px]"
                style={{
                  fontFamily: 'Inter, sans-serif',
                  borderRadius: 3,
                  border: '1px solid #E4E4E7',
                  color: '#09090B',
                }}
              >
                Sign in
              </button>
            )}
          </div>
        </div>
      )}
    </>
  );
}
