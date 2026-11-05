import React, { useEffect, useState } from 'react';
import { BusFront, Navigation, CalendarDays, History, Users, Settings, Clock3, MapPin, Wifi } from 'lucide-react';
import { api } from '../../services/api.js';
import ShuttleMap from '../../components/ShuttleMap.jsx';

import TripStreet from '../../components/TripStreet.jsx';
export default function Admin({ data, reload, currentUser }) {
  const [page, setPage] = useState('Dashboard'),
    [users, setUsers] = useState([]),
    [history, setHistory] = useState([]),
    [boardingHistory, setBoardingHistory] = useState([]),
    [form, setForm] = useState({ username: '', displayName: '', password: '', role: 'passenger' }),
    [message, setMessage] = useState('');
  useEffect(() => {
    if (page === 'Users')
      api('/admin/users')
        .then(setUsers)
        .catch((e) => setMessage(e.message));
    if (page === 'Trip History')
      api('/admin/history')
        .then(setHistory)
        .catch((e) => setMessage(e.message));
    if (page === 'Boarding History')
      api('/admin/boarding-history')
        .then(setBoardingHistory)
        .catch((e) => setMessage(e.message));
  }, [page]);
  async function changeUserStatus(u) {
    const active = !u.isActive;

    if (
      !window.confirm(
        active
          ? `Reactivate ${u.displayName}?`
          : `Remove ${u.displayName}? This will disable their account and sign them out.`,
      )
    )
      return;

    try {
      await api(`/admin/users/${u.id}/active`, {
        method: 'PATCH',
        body: JSON.stringify({ isActive: active }),
      });

      setUsers(await api('/admin/users'));
      setMessage(active ? 'User reactivated' : 'User removed');
    } catch (e) {
      setMessage(e.message);
    }
  }
  async function deleteUserPermanently(u) {
    const confirmation = window.prompt(
      `PERMANENT DELETION\n\nThis will permanently delete ${u.displayName}, their account, GPS records and boarding history.\n\nType the exact username "${u.username}" to continue:`
    );

    if (confirmation === null) return;

    if (confirmation !== u.username) {
      setMessage('Deletion cancelled: username does not match.');
      return;
    }

    if (!window.confirm(
      `FINAL WARNING\n\nPermanently delete "${u.username}" and their associated records?\n\nThis action cannot be undone.`
    )) return;

    try {
      await api(`/admin/users/${u.id}`, {
        method: 'DELETE',
        body: JSON.stringify({ confirmUsername: confirmation }),
      });

      setUsers(await api('/admin/users'));
      setMessage(`User "${u.username}" permanently deleted.`);
    } catch (e) {
      setMessage(e.message);
    }
  }
  async function addUser(e) {
    e.preventDefault();
    try {
      await api('/admin/users', { method: 'POST', body: JSON.stringify(form) });
      setMessage('User created');
      setUsers(await api('/admin/users'));
      setForm({ username: '', displayName: '', password: '', role: 'passenger' });
    } catch (e) {
      setMessage(e.message);
    }
  }
  return (
    <div className="admin-layout">
      <aside className="sidebar">
        {[
          ['Dashboard', BusFront],
          ['Routes', Navigation],
          ['Departures', CalendarDays],
          ['Trip History', History],
          ['Boarding History', Users],
          ['Users', Users],
          ['Settings', Settings],
        ].map(([name, Icon]) => (
          <button
            key={name}
            className={page === name ? 'current' : ''}
            onClick={() => {
              setPage(name);
              setMessage('');
            }}
          >
            <Icon size={20} />
            {name}
          </button>
        ))}
      </aside>
      <main className="admin-content">
        {message && <p className="notice">{message}</p>}
        {page === 'Dashboard' ? (
          <>
            <div className="admin-heading">
              <div>
                <h1>Welcome, Shuttle Administrator</h1>
                <p>Live information from the shuttle system.</p>
              </div>
              <div className="stats">
                <div>
                  <BusFront />
                  <small>Shuttle Status</small>
                  <b>{data?.status || 'At Stop'}</b>
                </div>
                <div>
                  <Clock3 />
                  <small>Last GPS Update</small>
                  <b>
                    {data?.lastGps
                      ? new Date(data.lastGps.updatedAt).toLocaleTimeString()
                      : 'Awaiting GPS'}
                  </b>
                </div>
                <div>
                  <MapPin />
                  <small>Route Stops</small>
                  <b>{data?.stops?.length || 0} stops</b>
                </div>
                <div>
                  <Wifi />
                  <small>Connection</small>
                  <b>Connected</b>
                </div>
              </div>
            </div>
            <div className="admin-grid">
              <section className="panel map-panel">
                <h3>Shuttle Location</h3>
                <ShuttleMap data={data} />
              </section>
              <section className="panel">
                <h3>Route Stops</h3>
                <div className="arrival-panel">
                  <b>Confirmed boardings today: {data?.counts?.boardedToday || 0}</b>
                  <b>Currently onboard: {data?.counts?.onboard || 0}</b>
                  <small>Check-in counts are GPS verified, not proof of physical boarding.</small>
                </div>
                {(data?.stops || []).map((s, i) => (
                  <div className="stop" key={s.id}>
                    <span>{i + 1}</span>
                    <div>
                      <b>{s.name}</b>
                      <p>{i === 0 ? 'Starting point' : 'Destination'}</p>
                    </div>
                  </div>
                ))}
              </section>
              <div className="right-stack">
                <section className="panel">
                  <h3>
                    <CalendarDays /> Shuttle Trip History
                  </h3>
                  <p>Administrator view of recorded shuttle GPS movements.</p>
                  <button className="primary" onClick={() => setPage('Trip History')}>
                    View Trip History
                  </button>
                </section>
                <section className="panel">
                  <h3>
                    <Users /> Administrator Access
                  </h3>
                  <div className="boarding-roster">
                    <b>Currently onboard</b>
                    {(data?.onboardUsers || []).map((u) => (
                      <p key={u.id}>
                        {u.displayName} - {u.originStop} -{' '}
                        {new Date(u.boardedAt).toLocaleString('en-ZA', {
                          timeZone: 'Africa/Johannesburg',
                          dateStyle: 'short',
                          timeStyle: 'short',
                        })}
                      </p>
                    ))}
                  </div>
                  <p>Create passenger, driver and administrator accounts.</p>
                  <button className="primary" onClick={() => setPage('Users')}>
                    Manage Users
                  </button>
                </section>
              </div>
            </div>
          </>
        ) : page === 'Users' ? (
          <>
            <h1>Users</h1>
            <section className="panel">
              <h3>Create Account</h3>
              <form className="user-form" onSubmit={addUser}>
                <input
                  required
                  placeholder="Username"
                  value={form.username}
                  onChange={(e) => setForm({ ...form, username: e.target.value })}
                />
                <input
                  required
                  placeholder="Display name"
                  value={form.displayName}
                  onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                />
                <input
                  required
                  minLength={7}
                  type="password"
                  placeholder="Password (7+ characters)"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                >
                  <option value="passenger">Passenger</option>
                  <option value="driver">Driver</option>
                  <option value="admin">Administrator</option>
                </select>
                <button className="primary">Create User</button>
              </form>
            </section>
            <section className="panel">
              <h3>Accounts</h3>
              {users.map((u) => (
                <div className="departure" key={u.id}>
                  <b>{u.username}</b>
                  <span>{u.displayName}</span>
                  <em>
                    {u.role} | {u.isActive ? 'Active' : 'Removed'}
                  </em>
                  {u.id !== currentUser?.id && (
                    <button
                      type="button"
                      onClick={() => changeUserStatus(u)}
                      style={{
                        background: u.isActive ? '#dc2626' : '#15803d',
                        color: 'white',
                        border: 0,
                        borderRadius: 8,
                        padding: '8px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      {u.isActive ? 'Remove' : 'Reactivate'}
                    </button>
                  )}
                  {u.id !== currentUser?.id && (
                    <button
                      type="button"
                      onClick={() => deleteUserPermanently(u)}
                      style={{
                        background: '#7f1d1d',
                        color: 'white',
                        border: 0,
                        borderRadius: 8,
                        padding: '8px 12px',
                        cursor: 'pointer',
                      }}
                    >
                      Delete Permanently
                    </button>
                  )}
                </div>
              ))}
            </section>
          </>
        ) : page === 'Boarding History' ? (
          <>
            <h1>Passenger Boarding History</h1>
            <section className="panel">
              <h3>Passenger Boarding Records</h3>
              <p>Latest 200 confirmed boarding records</p>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr>
                      {[
                        'Passenger',
                        'Boarding Stop',
                        'Destination',
                        'Boarded At',
                        'Exited At',
                        'Status',
                      ].map((h) => (
                        <th key={h} style={{ padding: '12px', borderBottom: '1px solid #cbd5e1' }}>
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {boardingHistory.map((b) => (
                      <tr key={b.id}>
                        <td style={{ padding: '12px' }}>{b.passengerName}</td>
                        <td style={{ padding: '12px' }}>{b.boardingStop}</td>
                        <td style={{ padding: '12px' }}>{b.destinationStop}</td>
                        <td style={{ padding: '12px' }}>
                          {new Date(b.boardedAt).toLocaleString('en-ZA', {
                            timeZone: 'Africa/Johannesburg',
                            dateStyle: 'medium',
                            timeStyle: 'short',
                          })}
                        </td>
                        <td style={{ padding: '12px' }}>
                          {b.exitedAt
                            ? new Date(b.exitedAt).toLocaleString('en-ZA', {
                                timeZone: 'Africa/Johannesburg',
                                dateStyle: 'medium',
                                timeStyle: 'short',
                              })
                            : '-'}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <b>{b.status}</b>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {!boardingHistory.length && <p>No passenger boarding records found.</p>}
            </section>
          </>
        ) : page === 'Trip History' ? (
          <>
            <h1>Shuttle Trip History</h1>
            <section className="panel">
              {history.length ? (
                history.map((h) => (
                  <div className="departure" key={h.id}>
                    <b>{new Date(h.createdAt).toLocaleString()}</b>
                    <span>{h.driver}</span>
                    <TripStreet lat={h.lat} lng={h.lng} />
                  </div>
                ))
              ) : (
                <p>No recorded GPS history yet.</p>
              )}
            </section>
          </>
        ) : page === 'Routes' ? (
          <>
            <h1>Routes</h1>

            <section className="panel">
              <h3>Stops</h3>
              {data?.stops?.map((s) => (
                <p key={s.id}>
                  {s.stop_order}. {s.name}
                </p>
              ))}
            </section>
          </>
        ) : page === 'Departures' ? (
          <>
            <h1>Departures</h1>
            <section className="panel departures">
              {data?.departures?.map((d) => (
                <div className="departure" key={d.id}>
                  <b>{d.departure_time}</b>
                  <span>{d.destination}</span>
                  <em>{d.status}</em>
                </div>
              ))}
            </section>
          </>
        ) : (
          <>
            <h1>Settings</h1>
            <section className="panel">
              <p>
                Account management and route data are stored in PostgreSQL. Contact your
                administrator for operational configuration.
              </p>
              <button className="primary" onClick={reload}>
                Refresh Data
              </button>
            </section>
          </>
        )}
      </main>
    </div>
  );
}
