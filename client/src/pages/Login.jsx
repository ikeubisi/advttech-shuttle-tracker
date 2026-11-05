import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { api } from '../services/api.js';
import Brand from '../components/Brand.jsx';
export default function Login({ onLogin }) {
  const [username, setUsername] = useState(''),
    [password, setPassword] = useState(''),
    [show, setShow] = useState(false),
    [remember, setRemember] = useState(true),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const x = await api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      onLogin(x.user);
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="login-page">
      <div className="login-overlay">
        <Brand />
        <form className="login-card" onSubmit={submit}>
          <h2>Sign In to Your Account</h2>
          <label className="field">
            <Mail size={20} />
            <input
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Email or Username"
              autoComplete="username"
            />
          </label>
          <label className="field">
            <Lock size={20} />
            <input
              required
              type={show ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
            />
            <button type="button" className="eye" onClick={() => setShow(!show)}>
              {show ? <EyeOff size={19} /> : <Eye size={19} />}
            </button>
          </label>
          <div className="login-options">
            <label>
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
              />{' '}
              Remember me
            </label>
            <span title="Contact your shuttle administrator to reset your password">
              Forgot password?
            </span>
          </div>
          {error && <p className="error">{error}</p>}
          <button className="primary" disabled={busy}>
            {busy ? 'Signing in...' : 'Sign In'}
          </button>
          <p className="signup">
            Don't have an account? <span>Contact administrator</span>
          </p>
        </form>
      </div>
    </div>
  );
}