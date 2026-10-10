import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Header, MarketingFooter } from "../components/Shell";
import { BrandMark, Wordmark } from "../components/Brand";
import Icon from "../components/Icon";

const colors = [
  { name: "Carbon", hex: "#202322", use: "Wordmarks, headings, and dark surfaces", dark: true },
  { name: "Signal", hex: "#DF5630", use: "The mark and moments of action", dark: false },
  { name: "Chalk", hex: "#F7F8F6", use: "Quiet, open backgrounds", dark: false },
  { name: "Alloy", hex: "#DCE0DC", use: "Dividers and supporting surfaces", dark: false },
];

export default function BrandPage() {
  const [dark, setDark] = useState(false);
  const [copyStatus, setCopyStatus] = useState("");
  async function copyColor(hex, name) {
    try {
      await navigator.clipboard.writeText(hex);
      setCopyStatus(`${name} ${hex} copied.`);
    } catch {
      setCopyStatus(`Copy unavailable. Select and copy ${name}: ${hex}.`);
    }
  }
  return <div className="marketing-site brand-page">
    <Header marketing />
    <main id="main-content">
      <section className="editorial-hero home-container brand-page-hero"><p className="section-kicker">The Starbase identity</p><h1>A clear signal.<br /><span>A solid foundation.</span></h1><div className="brand-hero-bottom"><p>Our identity reflects the way we work: precise, grounded, and open to possibility.</p><a className="button" href="/brand-assets/starbase-brand-kit.zip" download>Download brand kit <Icon name="download" /></a></div></section>
      <section className="identity-section home-container" aria-labelledby="identity-title">
        <div className="brand-section-label"><span>01 / The signature</span><h2 id="identity-title">A point of reference.</h2></div>
        <div className={`logo-stage ${dark ? "logo-stage-dark" : ""}`}><div className="logo-stage-top"><span>Primary signature</span><div className="surface-toggle" role="group" aria-label="Logo background"><button type="button" aria-pressed={!dark} onClick={() => setDark(false)}>Light</button><button type="button" aria-pressed={dark} onClick={() => setDark(true)}>Dark</button></div></div><div className="brand display-wordmark" aria-label="Starbase logo"><Wordmark /></div><div className="logo-stage-bottom"><span>Direction, with a foundation.</span><a href={`/brand-assets/starbase-logo-${dark ? "light" : "dark"}.svg`} download>Download SVG <Icon name="download" size={16} /></a></div></div>
        <div className="identity-detail"><div className="mark-construction" aria-hidden="true"><div /><BrandMark className="construction-mark" /><span>Starbase / Symbol</span></div><div className="identity-description"><h3>One mark. Room to build.</h3><p>Four points extend from an open center. The geometry suggests direction and a shared starting point, with enough simplicity to work from a browser tab to a presentation.</p><p>Use the full signature when introducing Starbase. Use the symbol when the name is already clear from the context.</p><a href="/brand-assets/starbase-mark.svg" download className="inline-link">Download the symbol <Icon name="download" size={17} /></a></div></div>
      </section>
      <section className="palette-section home-container" aria-labelledby="palette-title"><div className="brand-section-label"><span>02 / Color</span><h2 id="palette-title">Grounded, with a spark.</h2></div><div className="palette-grid">{colors.map(color => <article key={color.name}><div className={`color-swatch ${color.dark ? "color-swatch-dark" : ""}`} style={{ background: color.hex }}><span>{color.name}</span><button type="button" onClick={() => copyColor(color.hex, color.name)} aria-label={`Copy ${color.name} ${color.hex}`}><span>{color.hex}</span><span>Copy <Icon name="plus" size={14} /></span></button></div><p>{color.use}</p></article>)}</div><p className="copy-feedback" role="status" aria-live="polite">{copyStatus || "Select a color code to copy it."}</p></section>
      <section className="type-section home-container" aria-labelledby="type-title"><div className="brand-section-label"><span>03 / Type & voice</span><h2 id="type-title">Make the complex clear.</h2></div><div className="type-specimen"><div><span className="type-label">Inter / Sans serif</span><p className="type-large">Build with<br />perspective.</p><span className="type-alphabet">Aa Bb Cc · 0123456789</span></div><div className="voice-notes"><article><h3>Direct, with purpose.</h3><p>Use plain language, useful labels, and a clear next step. Explain the decision before the detail.</p></article><article><h3>Confident, with context.</h3><p>Say what the evidence supports. Make uncertainty visible. Give people room to exercise their judgment.</p></article><article><h3>Space to think.</h3><p>Keep layouts open and type readable. Use orange to guide attention, with dark text on light surfaces for longer reading.</p></article></div></div></section>
      <section className="usage-section home-container" aria-labelledby="usage-title"><div className="brand-section-label"><span>04 / In practice</span><h2 id="usage-title">Keep the identity consistent.</h2></div><div className="usage-grid"><article><span>01</span><h3>Give it space.</h3><p>Leave at least half the symbol’s width clear around the signature. Keep the full logo at least 120 px wide and the standalone symbol at least 24 px wide.</p></article><article><span>02</span><h3>Keep its character.</h3><p>Use the supplied artwork in its original proportions. Keep the mark upright and avoid stretching, shadows, outlines, or placing it on busy imagery.</p></article><article><span>03</span><h3>Write it Starbase.</h3><p>One word. A capital S. Use “Starbase” in product copy and “Starbase — Material selection” when more context helps.</p></article></div></section>
      <section className="brand-download home-container"><div><BrandMark /><h2>Ready to make<br />something with it.</h2><p>Light and dark SVG signatures, the symbol, and a concise usage guide.</p></div><div><a href="/brand-assets/starbase-brand-kit.zip" download className="button button-accent">Download brand kit <Icon name="download" /></a><Link to="/about" className="inline-link">The story behind Starbase <Icon name="arrow" /></Link></div></section>
    </main>
    <MarketingFooter />
  </div>;
}
