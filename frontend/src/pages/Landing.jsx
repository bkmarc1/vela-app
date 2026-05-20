import Hero from './landing/Hero';
import TwoPaths from './landing/TwoPaths';
import HowItWorks from './landing/HowItWorks';
import FinalCTA from './landing/FinalCTA';

// Propul8 Landing — minimal premium flow.
// 4 sections: Hero (with 4 proof cards) → Two paths → How it works (4 steps) → Final CTA.
export default function Landing() {
  return (
    <div data-testid="landing-page">
      <Hero />
      <TwoPaths />
      <HowItWorks />
      <FinalCTA />
    </div>
  );
}
