import { Link } from 'react-router-dom'
import { useLocale } from '../i18n/LocaleProvider'
import { paths } from '../routes/paths'

export function HeroSection() {
  const { t } = useLocale()

  return (
    <section className="hero" id="accueil">
      <div className="hero-copy">
        <p className="eyebrow"><span /> {t('hero.eyebrow')}</p>
        <h1>
          {t('hero.titleOne')}
          <br />
          {t('hero.titleTwo')}
          <br />
          <em>{t('hero.titleThree')}</em>
        </h1>
        <p className="hero-description">{t('hero.description')}</p>
        <div className="hero-actions">
          <Link className="button button-primary" to={paths.cards}>
            {t('hero.explore')} <span aria-hidden="true">→</span>
          </Link>
          <Link className="text-link" to={paths.mechanics}>
            {t('hero.discover')} <span aria-hidden="true">↘</span>
          </Link>
        </div>
        <div className="hero-note">
          <span className="note-rule" />
          <span>{t('hero.note')}</span>
        </div>
      </div>

      <div className="hero-art" aria-label={t('hero.artLabel')} role="img">
        <div className="moon" />
        <div className="hero-rune rune-one" aria-hidden="true">✳</div>
        <div className="hero-rune rune-two" aria-hidden="true">✦</div>
        <div className="dungeon-gate" aria-hidden="true">
          <div className="gate-arch">
            <div className="gate-inner">
              <div className="gate-stone gate-stone-one" />
              <div className="gate-stone gate-stone-two" />
              <div className="gate-stone gate-stone-three" />
              <div className="gate-stone gate-stone-four" />
              <div className="gate-door"><span className="gate-seal">✳</span></div>
            </div>
          </div>
          <div className="gate-base" />
        </div>
        <div className="art-caption">
          <span>{t('hero.depths')}</span>
          <span>{t('hero.levelsBosses')}</span>
        </div>
        <div className="art-vertical" aria-hidden="true">AD INFEROS</div>
      </div>
    </section>
  )
}
