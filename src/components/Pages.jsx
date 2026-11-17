import { ARTIST } from "../artist.js";

const year = new Date().getFullYear();

export function Copyright() {
  return (
    <p className="copyright">
      © {year} {ARTIST.name} ({ARTIST.alias}). All rights reserved.
    </p>
  );
}

function Page({ hue, onBack, onBackdropClick, children }) {
  return (
    <div className="page" style={{ "--h": hue }} onClick={onBackdropClick}>
      <button type="button" className="back" onClick={onBack}>
        ← back to the gallery
      </button>
      {children}
      <Copyright />
    </div>
  );
}

export function ArtPage({ piece, onBack }) {
  const { meta, name, src, hue } = piece;
  const details = [
    ["Artist", meta.artist],
    ["Available", meta.availability],
    ["Price", meta.price],
  ].filter(([, value]) => value);

  const closeOnBackdrop = (e) => {
    if (e.target === e.currentTarget) onBack();
  };

  return (
    <Page hue={hue} onBack={onBack} onBackdropClick={closeOnBackdrop}>
      <div className="art-layout" onClick={closeOnBackdrop}>
        <img className="art-image" src={src} alt={name} />
        <div className="art-info">
          <h1>{name}</h1>
          <dl>
            {details.map(([label, value]) => (
              <div key={label}>
                <dt>{label}</dt>
                <dd>{value}</dd>
              </div>
            ))}
          </dl>
          {meta.link && (
            <a className="buy" href={meta.link} target="_blank" rel="noreferrer">
              get it →
            </a>
          )}
        </div>
      </div>
    </Page>
  );
}

export function AboutPage({ onBack }) {
  return (
    <Page hue={270} onBack={onBack}>
      <div className="about">
        <p className="about-kicker">about me</p>
        <h1>{ARTIST.name}</h1>
        <p className="about-role">{ARTIST.role}</p>
        <p className="about-alias">aka {ARTIST.alias}</p>

        <section className="about-bio">
          <p>
            I draw monsters, tentacles, eyeballs, and animals in neon colors. A lot of them end
            up as stickers and prints.
          </p>
          <p>
            I'm also a fullstack developer, and I built this site. My portfolio has the code
            side of what I do.
          </p>
        </section>

        <h2 className="about-heading">find me</h2>
        <ul className="about-links">
          {ARTIST.links.map((link) => (
            <li key={link.label} style={{ "--h": link.hue }}>
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <span className="about-label">{link.label}</span>
                <span className="about-handle">{link.handle}</span>
              </a>
            </li>
          ))}
        </ul>

        <section className="legal">
          <h2>Copyright</h2>
          <p>
            All artwork on this site is © {year} {ARTIST.name} ({ARTIST.alias}). All rights
            reserved.
          </p>
          <p>
            You may not copy, reproduce, download, redistribute, sell, or modify any artwork on
            this site, or use it to train AI or machine-learning models, without written
            permission from the artist. Sharing a link to this site or to my accounts is always
            welcome.
          </p>
          <p>For licensing, commissions, or permission requests, message me on any of the accounts above.</p>
        </section>
      </div>
    </Page>
  );
}
