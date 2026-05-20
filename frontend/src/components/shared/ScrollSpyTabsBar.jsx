import { useEffect, useState } from 'react';

// Shared sticky tab bar with IntersectionObserver scroll-spy.
// Used by both INVEST (dark) and OPERATE (parchment) shells.

const THEMES = {
  dark: {
    bg: 'rgba(10,8,7,0.92)',
    activeColor: '#FAFAFA',
    inactiveColor: '#52525B',
    accent: '#B8956A',
    borderColor: 'rgba(196,167,137,0.10)',
  },
  light: {
    bg: 'rgba(242,234,216,0.92)',
    activeColor: '#09090B',
    inactiveColor: '#52525B',
    accent: '#B8956A',
    borderColor: 'rgba(9,9,11,0.10)',
  },
};

export default function ScrollSpyTabsBar({ tabs, theme = 'light', testIdPrefix = 'tab' }) {
  const t = THEMES[theme] || THEMES.light;
  const [active, setActive] = useState(tabs[0]?.id);

  useEffect(() => {
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting && e.intersectionRatio > 0.25) {
            setActive(e.target.getAttribute('data-testid'));
          }
        });
      },
      { rootMargin: '-30% 0px -55% 0px', threshold: [0.25] },
    );
    tabs.forEach((tab) => {
      const el = document.querySelector(`[data-testid="${tab.id}"]`);
      if (el) obs.observe(el);
    });
    return () => obs.disconnect();
  }, [tabs]);

  const scroll = (id) => {
    const el = document.querySelector(`[data-testid="${id}"]`);
    if (el) {
      const top = el.getBoundingClientRect().top + window.scrollY - 110;
      window.scrollTo({ top, behavior: 'smooth' });
    }
  };

  return (
    <div
      className="sticky z-30 border-b"
      style={{
        top: 64,
        background: t.bg,
        backdropFilter: 'blur(18px)',
        borderColor: t.borderColor,
      }}
      data-testid={`${testIdPrefix}-bar`}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-12">
        <nav className="flex items-center gap-1 overflow-x-auto h-12">
          {tabs.map((tab) => {
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => scroll(tab.id)}
                className="whitespace-nowrap px-3.5 py-2 text-[11.5px] font-medium tracking-[0.04em] transition-colors"
                style={{
                  color: isActive ? t.activeColor : t.inactiveColor,
                  borderBottom: isActive ? `1px solid ${t.accent}` : '1px solid transparent',
                }}
                data-testid={`${testIdPrefix}-${tab.label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
