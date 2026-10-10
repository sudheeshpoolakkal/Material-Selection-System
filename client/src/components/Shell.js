import React, { useContext, useEffect, useRef, useState } from "react";
import { NavLink, Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import Icon from "./Icon";
import Brand from "./Brand";

export { Brand };

export function MarketingFooter() {
  return <footer className="site-footer home-container"><div><Brand /><p>Better foundations. Better decisions.</p></div><nav aria-label="Footer navigation"><Link to="/materials">Workspace</Link><Link to="/about">About</Link><Link to="/brand">Brand</Link><Link to="/guide">Methodology</Link></nav><span className="footer-descriptor">Starbase · Material selection</span></footer>;
}
export function Header({ marketing = false }) {
  const { user, logout } = useContext(AuthContext);
  const { compareIds } = useWorkspace();
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const menuButton = useRef(null);
  useEffect(() => { setOpen(false); }, [location]);
  const links = marketing
    ? [["/#platform", "Platform"], ["/about", "About"], ["/guide", "Methodology"], ["/brand", "Brand"]]
    : [["/materials", "Materials"], ["/selection", "Selection"], ["/compare", "Compare"], ["/dashboard", "Projects"]];
  return <header className={`site-header ${marketing ? "marketing-header" : "app-header"}`} onKeyDown={e => { if (e.key === "Escape") { setOpen(false); menuButton.current?.focus(); } }}>
    <div className="header-inner">
      <Brand />
      <button ref={menuButton} className="menu-toggle" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} aria-controls="primary-navigation" onClick={() => setOpen(!open)}><Icon name={open ? "close" : "menu"} /></button>
      <div id="primary-navigation" className={`header-navigation ${open ? "is-open" : ""}`}>
        <nav aria-label="Main navigation">{links.map(([to, label]) => to.includes("#")
          ? <a key={to} href={to} onClick={() => setOpen(false)}>{label}</a>
          : <NavLink key={to} to={to}>{label}{to === "/compare" && compareIds.length > 0 && <span className="comparison-count">{compareIds.length}</span>}</NavLink>)}</nav>
        <div className="header-actions">{user ? <><Link to="/profile" className="header-account">{user.name || "Account"}</Link><button className="icon-button" aria-label="Sign out" onClick={() => { logout(); navigate("/"); }}><Icon name="logout" size={18} /></button></> : <Link to="/login" className="header-account">Sign in</Link>}{marketing ? <Link to="/materials" className="button">Open workspace <Icon name="arrow" size={17} /></Link> : <Link to="/guide" className="workspace-help" aria-label="Selection guide"><Icon name="help" size={20} /></Link>}</div>
      </div>
    </div>
  </header>;
}
export default function Shell() {
  return <div className="app-shell"><Header /><div className="workspace-main"><main id="main-content"><Outlet /></main><footer className="workspace-footer"><Link to="/">Starbase</Link><nav aria-label="Workspace footer"><Link to="/about">About</Link><Link to="/brand">Brand</Link><Link to="/guide">Data & methodology <Icon name="arrowUp" size={14} /></Link></nav></footer></div></div>;
}
