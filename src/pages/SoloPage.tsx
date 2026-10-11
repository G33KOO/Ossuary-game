import { PageHeading } from '../components/PageHeading'
import { useLocale } from '../i18n/LocaleProvider'

export function SoloPage() {
  const { t } = useLocale()

  return (
    <div className="page-wrap solo-page">
      <PageHeading
        artKey="le-martyr"
        description={t('solo.description')}
        eyebrow={t('solo.eyebrow')}
        title={
          <>
            {t('solo.titleOne')} <em>{t('solo.titleTwo')}</em>
          </>
        }
      >
        <p className="status-pill">{t('solo.status')}</p>
      </PageHeading>
    </div>
  )
}
