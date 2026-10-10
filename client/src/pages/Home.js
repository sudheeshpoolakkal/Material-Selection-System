import React from "react";
import { Link } from "react-router-dom";
import { Header, MarketingFooter } from "../components/Shell";
import Icon from "../components/Icon";

const capabilities = [
  { n: "01", title: "Explore the possibilities.", body: "Search material records and inspect the properties, sources, and conditions behind them.", link: "Explore materials", to: "/materials", className: "explore", visual: <div className="sample-collection" aria-hidden="true"><i /><i /><i /></div> },
  { n: "02", title: "Make the trade-offs visible.", body: "Set your requirements. Weigh what matters. See which candidates meet your limits, and why.", link: "Start a selection", to: "/selection", className: "evaluate", visual: <div className="priority-visual" aria-hidden="true"><div><span>Strength</span><i style={{"--fill":"78%"}} /></div><div><span>Low weight</span><i style={{"--fill":"92%"}} /></div><div><span>Relative cost</span><i style={{"--fill":"48%"}} /></div></div> },
  { n: "03", title: "Build a case for your choice.", body: "Compare candidates side by side, export properties, and save your selection with your project team.", link: "View your projects", to: "/dashboard", className: "decide", visual: <div className="comparison-visual" aria-hidden="true"><div /><div /><div /><span /><span /><span /><span /><span /><span /></div> },
];
export default function Home() {
  return <div className="marketing-site">
    <Header marketing />
    <main id="main-content">
      <section className="home-hero">
        <img className="home-hero-image" src="/images/material-study.webp" alt="Sculptural brushed aluminum, woven carbon fiber, and a titanium cylinder" fetchPriority="high" width="1536" height="1024" />
        <div className="home-hero-shade" />
        <div className="home-hero-content">
          <p className="hero-category">Material selection, made clear.</p>
          <h1>The foundation<br />for what<br /><span>comes next.</span></h1>
          <p className="home-hero-description">Explore materials. Understand the trade-offs.<br className="desktop-break" /> Find the right foundation for your next design.</p>
          <Link to="/materials" className="button button-accent">Explore Starbase <Icon name="arrow" size={20} /></Link>
        </div>
        <a href="#platform" className="hero-scroll" aria-label="Discover the Starbase platform"><span>Discover the platform</span><Icon name="arrow" size={18} /></a>
      </section>
      <section className="home-introduction home-container" id="platform">
        <p className="section-kicker">Meet Starbase</p>
        <div><h2>From material properties<br />to engineering decisions.</h2><p>Every design begins with a choice. Starbase brings material data, requirement screening, and comparison into one place—so you can understand your options before committing to one.</p></div>
      </section>
      <section className="capabilities home-container" aria-label="Platform capabilities">
        {capabilities.map(item => <article className={`capability ${item.className}`} key={item.n}><div className="capability-visual">{item.visual}</div><div className="capability-content"><h3>{item.title}</h3><p>{item.body}</p><Link to={item.to}>{item.link}<Icon name="arrow" size={18} /></Link></div></article>)}
      </section>
      <section className="workflow-section" id="workflow">
        <div className="home-container workflow-layout"><div className="workflow-heading"><p className="section-kicker">A clearer process</p><h2>Your requirements.<br />Your priorities.<br /><span>Your decision.</span></h2><Link to="/selection" className="button">Open selection studio <Icon name="arrow" size={18} /></Link></div><ol className="workflow-steps"><li><span>01</span><div><h3>Define the challenge</h3><p>Set the application, performance limits, and material properties your design needs.</p></div></li><li><span>02</span><div><h3>Understand the alternatives</h3><p>Screen candidates against your limits and adjust the balance between strength, weight, cost, and conductivity.</p></div></li><li><span>03</span><div><h3>Keep the reasoning</h3><p>Review the ranking, compare a shortlist, and save the requirements behind your selection.</p></div></li></ol></div>
      </section>
      <section className="evidence-section home-container"><p className="section-kicker">The reasoning stays visible</p><h2>No mystery behind<br />the recommendation.</h2><div><p>See the source of a property, the limits a candidate meets, and how your priorities shape its score. Starbase supports your judgment with a process you can inspect.</p><Link to="/guide" className="inline-link">Read our methodology <Icon name="arrowUp" size={18} /></Link><p className="evidence-note">Material records are a starting point for screening. Final design decisions require grade-specific data and engineering validation.</p></div></section>
      <section className="home-cta"><div className="home-container"><h2>Make your next<br />material decision.</h2><div><Link to="/materials" className="button button-accent">Open the workspace <Icon name="arrow" size={20} /></Link><p>Explore and compare without an account.</p></div></div></section>
    </main>
    <MarketingFooter />
  </div>;
}
