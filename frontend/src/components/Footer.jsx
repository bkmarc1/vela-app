// Propul8 — institutional Footer.
// Minimal black bar: "Propul8 · Hospitality Asset Intelligence" small-caps centered,
// gold #8B7355 on #0A0A0A, copyright row below.
import { Logomark } from './Logomark';

export default function Footer() {
  return (
    <footer
      className="mt-32"
      data-testid="propul8-footer"
      style={{
        background: '#0A0A0A',
        borderTop: '1px solid #1A1A1A',
      }}
    >
      <div className="max-w-[1280px] mx-auto px-6 md:px-12 py-9 flex flex-col items-center gap-2.5">
        <div className="flex items-center gap-3">
          <Logomark size={18} color="#8B7355" dot="#8B7355" />
          <span
            className="font-display"
            style={{
              color: '#8B7355',
              fontSize: 11.5,
              fontWeight: 500,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
            }}
          >
            Propul8 · Hospitality Asset Intelligence
          </span>
        </div>
        <div
          style={{
            color: '#52525B',
            fontSize: 10.5,
            letterSpacing: '0.14em',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
          }}
          data-testid="propul8-footer-copy"
        >
          © {new Date().getFullYear()} Propul8. All rights reserved.
        </div>
        <a
          href="/index-explained"
          style={{
            color: '#52525B',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            textDecoration: 'none',
            marginTop: 4,
          }}
          data-testid="footer-index-explainer-link"
        >
          What is the Propul8 Index? →
        </a>
        <a
          href="/vision"
          style={{
            color: '#52525B',
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            fontFamily: "'JetBrains Mono', ui-monospace, monospace",
            textDecoration: 'none',
            marginTop: 2,
          }}
          data-testid="footer-vision-link"
        >
          Vision &amp; Strategy →
        </a>
      </div>
    </footer>
  );
}
