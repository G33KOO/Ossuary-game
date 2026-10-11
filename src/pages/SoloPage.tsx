import { useLocale } from '../i18n/LocaleProvider'

export function SoloPage() {
  const { t } = useLocale()

  return (
    <div className="page-wrap solo-page">
      <header className="page-heading">
        <p className="eyebrow"><span /> {t('solo.eyebrow')}</p>
        <h1>
          {t('solo.titleOne')} <em>{t('solo.titleTwo')}</em>
        </h1>
        <p>{t('solo.description')}</p>
        <p className="status-pill">{t('solo.status')}</p>
      </header>
    </div>
  )
}
