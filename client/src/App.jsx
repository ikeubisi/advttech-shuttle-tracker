import React, { useEffect, useState } from 'react';
import { api } from './services/api.js';
import Login from './pages/Login.jsx';
import Passenger from './pages/passenger/Passenger.jsx';
import Driver from './pages/driver/Driver.jsx';
import Admin from './pages/admin/Admin.jsx';
import Topbar from './components/Topbar.jsx';
export default function App() {
  const [user, setUser] = useState(undefined),
    [data, setData] = useState(null),
    [error, setError] = useState('');
  useEffect(() => {
    api('/auth/me')
      .then((x) => setUser(x.user))
      .catch(() => setUser(null));
  }, []);
  async function reload() {
    try {
      setData(await api('/overview'));
      setError('');
    } catch (e) {
      setError(e.message);
    }
  }
  useEffect(() => {
    if (!user) return;
    reload();
    const id = setInterval(reload, 5000);
    return () => clearInterval(id);
  }, [user]);
  async function logout() {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {}
    setUser(null);
  }
  if (user === undefined) return <div className="loading">Loading Shuttle Tracker...</div>;
  if (!user) return <Login onLogin={setUser} />;
  return (
    <div className="app">
      <Topbar user={user} onLogout={logout} />
      {error && <p className="notice">{error}</p>}
      {user.role === 'admin' ? (
        <Admin data={data} reload={reload} currentUser={user} />
      ) : user.role === 'driver' ? (
        <Driver data={data} reload={reload} />
      ) : (
        <Passenger data={data} reload={reload} />
      )}
    </div>
  );
}
