import React, { useContext, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { Brand } from "../components/Shell";
import Icon from "../components/Icon";
import { Field, ErrorMessage } from "../components/UI";
export default function Auth({ register = false }) {
  const { login } = useContext(AuthContext);
  const [name, setName] = useState(""),
    [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [show, setShow] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const raw = params.get("next");
  const next =
    raw && raw.startsWith("/") && !raw.startsWith("//") ? raw : "/dashboard";
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const { data } = await axios.post(
        `/api/auth/${register ? "register" : "login"}`,
        { name, email, password },
      );
      const { token, ...user } = data;
      login(token, user);
      navigate(next, { replace: true });
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Could not connect to your workspace. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="auth-page">
      <section className="auth-story" style={{backgroundImage: "url(/images/material-study.webp)"}}>
        <Brand />
        <div className="auth-story-content">
          
          <h1>
            The right material.
            <br />
            <em>The next possibility.</em>
          </h1>
          <p>
            Save your material selections
            <br />and work with your team.
          </p>
          <div className="auth-art" aria-hidden="true">
            <div className="orbital orbital-back" />
            <div className="orbital orbital-front" />
          </div>
          <div className="auth-story-footer">
            <span>01 / EXPLORE</span>
            <span>02 / EVALUATE</span>
            <span>03 / DECIDE</span>
          </div>
        </div>
        <span className="auth-copyright">
          STARBASE · MATERIAL SELECTION SYSTEM
        </span>
      </section>
      <section className="auth-form-side" id="main-content">
        <Link to="/materials" className="auth-back">
          <Icon name="arrow" size={16} />
          Back to the library
        </Link>
        <div className="auth-form-content">
          
          <h2>{register ? "Create an account." : "Welcome back."}</h2>
          <p>
            {register
              ? "Create an account to save selections and work with your team."
              : "Sign in to pick up where you left off."}
          </p>
          <form onSubmit={submit}>
            <ErrorMessage message={error} />
            {register && (
              <Field label="Your name">
                <input
                  autoComplete="name"
                  required
                  value={name}
                  maxLength="100"
                  placeholder="Full name"
                  onChange={(e) => setName(e.target.value)}
                />
              </Field>
            )}
            <Field label="Email address">
              <input
                required
                type="email"
                autoComplete="email"
                value={email}
                placeholder="you@example.com"
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Field
              label="Password"
              hint={register ? "Use at least 8 characters." : ""}
            >
              <div className="password-input">
                <input
                  required
                  minLength={register ? 8 : undefined}
                  type={show ? "text" : "password"}
                  autoComplete={register ? "new-password" : "current-password"}
                  value={password}
                  placeholder={register ? "Create a password" : "Your password"}
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => setShow(!show)}
                  aria-label={show ? "Hide password" : "Show password"}
                >
                  {show ? "Hide" : "Show"}
                </button>
              </div>
            </Field>
            <button className="button full-width auth-submit" disabled={busy}>
              {busy
                ? "Opening workspace…"
                : register
                  ? "Create account"
                  : "Sign in"}
              <Icon name="arrow" />
            </button>
          </form>
          <p className="auth-switch">
            {register ? "Already have an account?" : "New to Starbase?"}
            <Link
              to={`${register ? "/login" : "/register"}?next=${encodeURIComponent(next)}`}
            >
              {register ? "Sign in" : "Create an account"}
            </Link>
          </p>
          <div className="auth-divider">
            <span />
            or start exploring
            <span />
          </div>
          <Link className="button button-secondary full-width" to="/materials">
            Browse the material library
            <Icon name="arrowUp" size={16} />
          </Link>
        </div>
        <p className="auth-footnote">Thoughtful tools. Informed decisions.</p>
      </section>
    </div>
  );
}
