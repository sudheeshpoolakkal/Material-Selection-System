import React, { useContext, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { AuthContext } from "../context/AuthContext";
import { useWorkspace } from "../context/WorkspaceContext";
import { Field, ErrorMessage, Empty } from "../components/UI";
import Icon from "../components/Icon";
export default function Profile() {
  const { user, token, updateUser } = useContext(AuthContext);
  const { setNotice } = useWorkspace();
  const [name, setName] = useState(user?.name || ""),
    [email, setEmail] = useState(user?.email || ""),
    [current, setCurrent] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  async function save(e, change = false) {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      const { data } = await axios.put(
        `/api/auth/${change ? "change-password" : "profile"}`,
        change
          ? { currentPassword: current, newPassword: password }
          : { name, email },
        { headers: { Authorization: `Bearer ${token}` } },
      );
      if (change) {
        setCurrent("");
        setPassword("");
      } else updateUser(data.user);
      setNotice(change ? "Password updated." : "Profile updated.");
    } catch (e) {
      setError(e.response?.data?.message || "Could not save changes.");
    } finally {
      setBusy(false);
    }
  }
  if (!user)
    return (
      <div className="page">
        <Empty
          title="Sign in to manage your account"
          description="Your saved workspace is linked to your account."
        >
          <Link className="button" to="/login?next=/profile">
            Sign in
          </Link>
        </Empty>
      </div>
    );
  return (
    <div className="page profile-page">
      <div className="page-heading">
        <div>
          
          <h1>
            Account settings<span className="heading-period">.</span>
          </h1>
          <p>Manage your profile and account security.</p>
        </div>
        <span className="profile-avatar">
          {(user.name || user.email)[0].toUpperCase()}
        </span>
      </div>
      <ErrorMessage message={error} />
      <div className="settings-grid">
        <section className="settings-card">
          
          <h2>Your profile</h2>
          <form onSubmit={(e) => save(e)}>
            <Field label="Display name">
              <input
                required
                maxLength="100"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </Field>
            <Field label="Email address">
              <input
                required
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <button className="button" disabled={busy}>
              Save changes
              <Icon name="check" size={16} />
            </button>
          </form>
        </section>
        <section className="settings-card">
          
          <h2>Change password</h2>
          <form onSubmit={(e) => save(e, true)}>
            <Field label="Current password">
              <input
                required
                type="password"
                autoComplete="current-password"
                value={current}
                onChange={(e) => setCurrent(e.target.value)}
              />
            </Field>
            <Field label="New password" hint="At least 8 characters.">
              <input
                required
                minLength="8"
                type="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <button className="button button-secondary" disabled={busy}>
              Update password
              <Icon name="arrow" size={16} />
            </button>
          </form>
        </section>
      </div>
    </div>
  );
}
