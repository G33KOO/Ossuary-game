import { HeroSection } from '../components/HeroSection'
import { IntroSection } from '../components/IntroSection'
import { MechanicsSection } from '../components/MechanicsSection'
import { StatStrip } from '../components/StatStrip'

export function HomePage() {
  return (
    <>
      <HeroSection />
      <StatStrip />
      <IntroSection />
      <MechanicsSection />
    </>
  )
}
