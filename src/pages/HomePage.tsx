import { CardShowcase } from '../components/CardShowcase'
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
      <CardShowcase
        cardType="Classe"
        description="showcase.classesDescription"
        eyebrow="showcase.classesEyebrow"
        title="showcase.classesTitle"
      />
      <MechanicsSection />
      <CardShowcase
        cardType="Boss"
        description="showcase.bossesDescription"
        eyebrow="showcase.bossesEyebrow"
        title="showcase.bossesTitle"
      />
    </>
  )
}
