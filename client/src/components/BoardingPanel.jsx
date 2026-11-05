import React, { useEffect, useState } from 'react';
import { api } from '../services/api.js';
export default function BoardingPanel({ data, reload }) {
  const [origin, setOrigin] = useState(''),
    [message, setMessage] = useState(''),
    [busy, setBusy] = useState(false);
  const stops = data?.stops || [];
  useEffect(() => {
    if (!origin && stops.length) setOrigin(String(stops[0].id));
  }, [stops.length]);
  async function send(kind) {
    if (!navigator.geolocation) {
      setMessage('GPS is not supported');
      return;
    }
    setBusy(true);
    setMessage('Checking phone GPS...');
    navigator.geolocation.getCurrentPosition(
      async (p) => {
        try {
          const body = {
            lat: p.coords.latitude,
            lng: p.coords.longitude,
            accuracy: p.coords.accuracy,
            timestamp: p.timestamp,
            ...(kind === 'board' ? { stopId: Number(origin) } : {}),
          };
          const result = await api('/passenger/' + kind, {
            method: 'POST',
            body: JSON.stringify(body),
          });
          setMessage(result.message || 'Confirmed');
          reload();
        } catch (e) {
          setMessage(e.message);
        } finally {
          setBusy(false);
        }
      },
      (e) => {
        setMessage(e.message);
        setBusy(false);
      },
      { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
    );
  }
  return (
    <section className="panel boarding-panel">
      <h3>My shuttle journey</h3>
      <p>
        Check in only after physically boarding. Your phone and the shuttle must be at the same
        stop.
      </p>
      <label>
        Boarding stop{' '}
        <select value={origin} onChange={(e) => setOrigin(e.target.value)}>
          {stops.map((s) => (
            <option value={s.id} key={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <div className="boarding-actions">
        <button disabled={busy || !origin || !!data?.myBoarding} onClick={() => send('board')}>
          Confirm boarding
        </button>
        <button disabled={busy || !data?.myBoarding} onClick={() => send('exit')}>
          Confirm exit
        </button>
      </div>
      <p>
        {data?.myBoarding
          ? 'You are checked in. Confirm exit at the destination.'
          : 'You are not currently checked in.'}
      </p>
      {message && <p role="status">{message}</p>}
    </section>
  );
}
