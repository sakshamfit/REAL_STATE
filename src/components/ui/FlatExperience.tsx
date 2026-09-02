'use client'

import { clients, company, processStages, services, trustPillars } from '@/data/company'
import { locationsForState, presenceStates, stateId } from '@/data/presence'
import { Reveal } from './Reveal'

/**
 * Low-power / SKIP 3D / no-WebGL path: the same story, told with typography
 * only. Still frames, simple transitions, full content.
 */
export function FlatExperience() {
  return (
    <div className="flat">
      <div className="flat__beats">
        <Reveal className="flat__section">
          <p className="eyebrow">RUDRA CONSTRUCTIONS &amp; SUPPLIERS</p>
          <h1 className="display display--xl">
            <span className="line">
              <span>BUILDING</span>
            </span>
            <span className="line">
              <span>THE FUTURE</span>
            </span>
          </h1>
          <p className="body-text reveal">
            <span>WITH STRENGTH, INTEGRITY &amp; INNOVATION.</span>
            <span>{company.tagline}</span>
          </p>
        </Reveal>

        <Reveal className="flat__section">
          <p className="eyebrow">THE COMPANY</p>
          <h2 className="display">
            <span className="line">
              <span>FROM CONCEPT</span>
            </span>
            <span className="line">
              <span>TO COMPLETION.</span>
            </span>
          </h2>
          <div className="meta">
            <div className="reveal">
              <span className="meta__value meta__value--accent">{company.turnover}</span>
              <span className="meta__label">{company.turnoverLabel}</span>
            </div>
            <div className="reveal">
              <span className="meta__value">{company.founded}</span>
              <span className="meta__label">FOUNDED</span>
            </div>
          </div>
          <p className="note reveal">Construction. Infrastructure. Renewable Energy.</p>
        </Reveal>

        <Reveal className="flat__section">
          <p className="eyebrow">SERVICES</p>
          <h2 className="display">
            <span className="line">
              <span>SIX DISCIPLINES.</span>
            </span>
          </h2>
          <div className="flat__cards reveal">
            {services.map((service) => (
              <article className="flat__card" key={service.index}>
                <p className="index">{service.index}</p>
                <h3 className="display" style={{ fontSize: 'clamp(1.35rem, 2vw, 1.9rem)' }}>
                  {service.title.map((line) => (
                    <span key={line} style={{ display: 'block' }}>
                      {line}
                    </span>
                  ))}
                </h3>
                <p className="body-text" style={{ marginTop: 14 }}>
                  {service.detail}
                </p>
              </article>
            ))}
          </div>
        </Reveal>

        <Reveal className="flat__section">
          <p className="eyebrow">HOW WE BUILD</p>
          <h2 className="display">
            <span className="line">
              <span>FIVE STAGES.</span>
            </span>
          </h2>
          <ol className="flat__list reveal">
            {processStages.map((stage) => (
              <li key={stage.index} className="client-list" style={{ display: 'flex', gap: 16 }}>
                <span className="index" style={{ margin: 0, minWidth: 28 }}>
                  {stage.index}
                </span>
                <span>
                  <strong style={{ letterSpacing: '0.12em' }}>{stage.title.join(' ')}</strong>
                  <span style={{ color: 'var(--muted)' }}> — {stage.body}</span>
                </span>
              </li>
            ))}
          </ol>
        </Reveal>

        <Reveal className="flat__section">
          <p className="eyebrow">TRUST</p>
          <h2 className="display">
            <span className="line">
              <span>BUILT ON</span>
            </span>
            <span className="line">
              <span>STANDARD.</span>
            </span>
          </h2>
          <div className="flat__states reveal">
            {trustPillars.map((pillar) => (
              <span className="state-rail__item" key={pillar}>
                {pillar}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal className="flat__section">
          <p className="eyebrow">CLIENTS</p>
          <h2 className="display">
            <span className="line">
              <span>WHO TRUSTS US.</span>
            </span>
          </h2>
          <ul className="client-list reveal">
            {clients.map((client) => (
              <li key={client}>{client}</li>
            ))}
          </ul>
        </Reveal>

        <Reveal className="flat__section" id="presence">
          <p className="eyebrow">PRESENCE</p>
          <h2 className="display">
            <span className="line">
              <span>OUR PRESENCE</span>
            </span>
            <span className="line">
              <span>ACROSS INDIA</span>
            </span>
          </h2>
          <p className="body-text reveal">Building stronger communities across regions.</p>
          <div className="flat__states reveal">
            {presenceStates.map((state) => {
              const locations = locationsForState(stateId(state.name))
              return (
                <span className="state-rail__item" key={state.name}>
                  {state.label}
                  {locations.length ? ` — ${locations.map((location) => location.city).join(', ')}` : ''}
                </span>
              )
            })}
          </div>
        </Reveal>

        <Reveal className="flat__section" id="contact">
          <p className="eyebrow">CONTACT</p>
          <h2 className="display">
            <span className="line">
              <span>LET&apos;S BUILD</span>
            </span>
            <span className="line">
              <span>THE FUTURE</span>
            </span>
            <span className="line">
              <span>TOGETHER.</span>
            </span>
          </h2>
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
        </Reveal>

        <footer className="footer">
          <div>
            <p className="footer__brand">
              {company.name}
              <small>{company.legalName}</small>
            </p>
            <p className="footer__tag" style={{ marginTop: 18 }}>
              Engineering Trust. Constructing Excellence.
            </p>
          </div>
          <div className="footer__row">
            <p className="footer__copy">{company.copyright}</p>
          </div>
        </footer>
      </div>
    </div>
  )
}
