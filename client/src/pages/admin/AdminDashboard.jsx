import React from 'react';
import {
  BusFront,
  Clock3,
  MapPin,
  Wifi,
  CalendarDays,
  Users,
} from 'lucide-react';

import ShuttleMap from '../../components/ShuttleMap.jsx';

export default function AdminDashboard({ data, setPage }) {
  return (
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
  );
}