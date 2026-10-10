import React from "react";
import { Link } from "react-router-dom";
import { Header, MarketingFooter } from "../components/Shell";
import { BrandMark } from "../components/Brand";
import Icon from "../components/Icon";

const principles = [
  ["01", "Evidence before assumption.", "A property is only as useful as the context behind it. Keep sources, test conditions, and missing values visible, from the first search to the final shortlist."],
  ["02", "Trade-offs in the open.", "There is no universal best material. Start with the demands of your design, then make the balance between competing priorities explicit."],
  ["03", "Reasoning worth keeping.", "A good decision should be explainable later. Keep requirements and recommendations together, compare the alternatives, and bring your team into the process."],
];

export default function About() {
  return <div className="marketing-site about-page">
    <Header marketing />
    <main id="main-content">
      <section className="editorial-hero home-container">
        <p className="section-kicker">About Starbase</p>
        <h1>Every great design<br />needs a <span>foundation.</span></h1>
        <div className="editorial-intro"><p>An engineering workspace for the decisions everything else is built on.</p><p>Starbase brings material exploration, requirement screening, and comparison together. A place to understand your options—and keep the reasoning behind your choice.</p></div>
      </section>
      <section className="about-material-image" aria-label="The materials behind the possibilities">
        <img src="/images/material-study.webp" alt="Brushed metal and woven carbon fiber arranged as sculptural material samples" width="1536" height="1024" />
        <div className="about-image-caption"><BrandMark /><span>Many materials.<br />One considered choice.</span><span className="image-caption-note">A study in material textures</span></div>
      </section>
      <section className="brand-story home-container">
        <p className="section-kicker">Why Starbase</p>
        <div><h2>A starting point.<br />A clearer direction.</h2><p>The name brings together two ideas: a star to find your bearings, and a base to build from. For us, that means a grounded starting point for exploring what a design could become.</p><p>Material selection is where ambition meets constraints. Starbase helps you work through both, with the evidence and the alternatives in view.</p><Link className="inline-link" to="/brand">Explore our identity <Icon name="arrow" /></Link></div>
      </section>
      <section className="principles-section home-container"><div className="editorial-section-heading"><p className="section-kicker">What guides the work</p><h2>Clarity at every step.</h2></div><div className="principle-list">{principles.map(([n, title, body]) => <article key={n}><span>{n}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section className="about-evidence home-container"><div><p className="section-kicker">Built for engineering judgment</p><h2>Know what the<br />data can tell you.</h2></div><div><p>Supplier records, engineering references, and research observations each offer a different kind of evidence. Starbase keeps their sources and conditions attached, so you can judge how a value applies to your design.</p><p>A missing property stays unknown. A score reflects your priorities. Final design decisions still need grade-specific evidence, relevant test methods, and engineering validation.</p><Link to="/guide" className="inline-link">Read the methodology <Icon name="arrowUp" /></Link></div></section>
      <section className="home-cta"><div className="home-container"><h2>Start with<br />a better foundation.</h2><div><Link to="/materials" className="button button-accent">Explore Starbase <Icon name="arrow" /></Link><p>Explore and compare without an account.</p></div></div></section>
    </main>
    <MarketingFooter />
  </div>;
}
