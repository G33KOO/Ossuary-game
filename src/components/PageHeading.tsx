import type { ReactNode } from 'react'
import { getIllustrationByKey } from '../utils/cardIllustration'

type PageHeadingProps = {
  eyebrow?: string
  title: ReactNode
  description?: string
  artKey?: string
  children?: ReactNode
}

export function PageHeading({ eyebrow, title, description, artKey, children }: PageHeadingProps) {
  const art = artKey ? getIllustrationByKey(artKey) : undefined

  return (
    <header className={`page-heading${art ? ' has-art' : ''}`}>
      <div className="page-heading-copy">
        {eyebrow && <p className="eyebrow"><span /> {eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-heading-description">{description}</p>}
        {children}
      </div>
      {art && (
        <figure className="page-heading-art">
          <img alt="" src={art.src} />
        </figure>
      )}
    </header>
  )
}
