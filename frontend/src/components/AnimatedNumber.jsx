import { useEffect, useRef, useState } from 'react';

/**
 * AnimatedNumber — subtle warm "before → after" transition.
 *
 * Two modes:
 *  • single: counts from 0 → target on mount
 *  • transition: counts from `from` → `to` once visible (used for revenue
 *    transitions like €180 → €245). Repeats every `loopMs` if `loop` true.
 *
 * Restraint over flash: easing is cubic-out, duration ~1100ms, no bounce.
 */
export default function AnimatedNumber({
  from,
  to,
  prefix = '',
  suffix = '',
  duration = 1100,
  loop = false,
  loopMs = 4200,
  className = '',
  testid,
}) {
  const startVal = from ?? 0;
  const endVal = to ?? 0;
  const [val, setVal] = useState(startVal);
  const [visible, setVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current) return;
    const obs = new IntersectionObserver(
      (entries) => entries.forEach((e) => e.isIntersecting && setVisible(true)),
      { threshold: 0.4 },
    );
    obs.observe(ref.current);
    return () => obs.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    let raf;
    let killed = false;

    const run = () => {
      const start = performance.now();
      const tick = (t) => {
        if (killed) return;
        const p = Math.min(1, (t - start) / duration);
        const eased = 1 - Math.pow(1 - p, 3);
        setVal(Math.round(startVal + (endVal - startVal) * eased));
        if (p < 1) raf = requestAnimationFrame(tick);
        else if (loop) {
          setTimeout(() => {
            if (killed) return;
            setVal(startVal);
            setTimeout(run, 220);
          }, loopMs - duration);
        }
      };
      raf = requestAnimationFrame(tick);
    };
    run();

    return () => {
      killed = true;
      if (raf) cancelAnimationFrame(raf);
    };
  }, [visible, startVal, endVal, duration, loop, loopMs]);

  return (
    <span ref={ref} className={className} data-testid={testid}>
      {prefix}
      {val.toLocaleString()}
      {suffix}
    </span>
  );
}
