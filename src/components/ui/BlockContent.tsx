import { company, clients } from '@/data/company'
import type { TextBlock } from '@/lib/chapters'

export function BlockContent({ block }: { block: TextBlock }) {
  return (
    <>
      {block.index ? <p className="index reveal">{block.index}</p> : null}
      {block.eyebrow ? <p className="eyebrow reveal">{block.eyebrow}</p> : null}

      {block.lines?.length ? (
        <h2 className={`display reveal ${block.slot === 'hero' ? 'display--hero' : ''}`}>
          {block.lines.map((line, index) => (
            <span className="line" key={`${line}-${index}`}>
              <span>{line}</span>
            </span>
          ))}
        </h2>
      ) : null}

      {block.sub ? <p className="subhead reveal">{block.sub}</p> : null}

      {block.body?.length ? (
        <p className="body-text reveal">
          {block.body.map((line) => (
            <span key={line}>{line}</span>
          ))}
        </p>
      ) : null}

      {block.meta?.length ? (
        <div className="meta">
          {block.meta.map((item) => (
            <div key={item.label} className="reveal">
              <span className={`meta__value ${item.value.startsWith('₹') ? 'meta__value--accent' : ''}`}>
                {item.value}
              </span>
              <span className="meta__label">{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}

      {block.note ? <p className="note reveal">{block.note}</p> : null}

      {block.slot === 'clients' ? (
        <ul className="client-list reveal">
          {clients.map((client) => (
            <li key={client}>{client}</li>
          ))}
        </ul>
      ) : null}

      {block.slot === 'contact' ? (
        <div className="contact">
          <a className="contact__cta reveal" href={company.emailHref}>
            START A PROJECT <span aria-hidden="true">→</span>
          </a>
          <a className="contact__line reveal" href={company.phoneHref}>
            {company.phone}
          </a>
          <a className="contact__line reveal" href={company.emailHref}>
            {company.email}
          </a>
        </div>
      ) : null}

      {block.slot === 'footer' ? (
        <footer className="footer">
          <div className="reveal">
            <p className="footer__brand">
              {company.name}
              <small>{company.legalName}</small>
            </p>
            <p className="footer__tag" style={{ marginTop: 18 }}>
              Engineering Trust. Constructing Excellence.
            </p>
          </div>
          <div className="footer__row reveal">
            <nav className="footer__links" aria-label="Footer">
              <button type="button" onClick={() => scrollToBeatById('build')}>
                Work
              </button>
              <button type="button" onClick={() => scrollToBeatById('services-intro')}>
                Services
              </button>
              <button type="button" onClick={() => scrollToBeatById('india')}>
                Presence
              </button>
              <button type="button" onClick={() => scrollToBeatById('contact')}>
                Contact
              </button>
              <a href="/projects">Projects</a>
              <a href="/admin">Admin</a>
            </nav>
            <p className="footer__copy">{company.copyright}</p>
          </div>
        </footer>
      ) : null}
    </>
  )
}

function scrollToBeatById(id: string) {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent('rudra:navigate', { detail: id }))
}
