import React, { useContext, useEffect } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useSearchParams,
  useLocation,
} from "react-router-dom";
import { AuthProvider, AuthContext } from "./context/AuthContext";
import { WorkspaceProvider } from "./context/WorkspaceContext";
import Shell from "./components/Shell";
import Home from "./pages/Home";
import Materials from "./pages/Materials";
import Selection from "./pages/Selection";
import Compare from "./pages/Compare";
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import Auth from "./pages/Auth";
import Guide from "./pages/Guide";
import About from "./pages/About";
import BrandPage from "./pages/Brand";
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (hash) document.getElementById(hash.slice(1))?.scrollIntoView();
    else window.scrollTo(0, 0);
    const pagePath = pathname.replace(/\/+$/, "") || "/";
    const titles = { "/": "Material selection, made clear", "/about": "About", "/brand": "Brand identity", "/materials": "Material library", "/selection": "Selection studio", "/compare": "Compare materials", "/dashboard": "Projects", "/guide": "Methodology", "/login": "Sign in", "/register": "Create an account", "/profile": "Account" };
    const descriptions = {
      "/": "Starbase brings material data, requirement screening, and comparison into one workspace. Better foundations. Better decisions.",
      "/about": "Meet Starbase: an engineering workspace for material exploration, transparent trade-offs, and decisions grounded in evidence.",
      "/brand": "Explore the Starbase identity. Download logos and the brand kit, copy our colors, and find guidance for using the signature.",
    };
    const description = descriptions[pagePath] || "Explore, screen, and compare engineering materials with the Starbase material selection workspace.";
    document.querySelector('meta[name="description"]')?.setAttribute("content", description);
    document.title = `${titles[pagePath] || "Workspace"} — Starbase`;
  }, [pathname, hash]);
  return null;
}
function AuthRoute({ register }) {
  const { user } = useContext(AuthContext);
  const [params] = useSearchParams();
  const next = params.get("next");
  return user ? (
    <Navigate
      to={next?.startsWith("/") && !next.startsWith("//") ? next : "/dashboard"}
      replace
    />
  ) : (
    <Auth register={register} />
  );
}
export default function App() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <BrowserRouter
          future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
        >
          <ScrollToTop />
          <a className="skip-link" href="#main-content">
            Skip to content
          </a>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/about" element={<About />} />
            <Route path="/brand" element={<BrandPage />} />
            <Route path="/login" element={<AuthRoute />} />
            <Route path="/register" element={<AuthRoute register />} />
            <Route element={<Shell />}>
              <Route path="/materials" element={<Materials />} />
              <Route path="/selection" element={<Selection />} />
              <Route path="/compare" element={<Compare />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/profile" element={<Profile />} />
              <Route path="/guide" element={<Guide />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </BrowserRouter>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
