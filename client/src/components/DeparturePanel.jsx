import React, { useEffect, useState } from 'react';
import { Clock3, Users, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';

export default function DeparturePanel({ reload }) {
  const [departure, setDeparture] = useState(null);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [seconds, setSeconds] = useState(0);

  async function refresh() {
    try {
      const result = await api('/driver/departure-state');
      setDeparture(result.departure);
      setSeconds(result.departure?.remainingSeconds ?? 0);
      setError('');
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((current) => Math.max(0, current - 1));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  async function confirm() {
    setConfirming(true);
    setError('');
    setMessage('');

    try {
      const result = await api('/driver/confirm-departure', {
        method: 'POST',
      });

      setMessage(result.message);
      await refresh();
      reload?.();
    } catch (e) {
      setError(e.message);
    } finally {
      setConfirming(false);
    }
  }

  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;
  const countdown =
    `${String(minutes).padStart(2, '0')}:${String(remaining).padStart(2, '0')}`;

  const count = departure?.passengerCount ?? 0;
  const threshold = departure?.passengerThreshold ?? 13;
  const progress = Math.min(100, (count / threshold) * 100);

  return (
    <section className="panel" style={{ marginTop: 20 }}>
      <h3>Departure Control</h3>

      {loading ? (
        <p>Loading departure information...</p>
      ) : !departure ? (
        <p>Waiting for GPS-confirmed arrival at a shuttle stop.</p>
      ) : (
        <>
          <p><strong>Status:</strong> {departure.status}</p>

          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap', marginTop: 16 }}>
            <div>
              <Clock3 size={22} />
              <p>Waiting time remaining</p>
              <h2 style={{ margin: '4px 0' }}>{countdown}</h2>
            </div>

            <div>
              <Users size={22} />
              <p>Passengers boarded at this stop</p>
              <h2 style={{ margin: '4px 0' }}>{count} / {threshold}</h2>
            </div>
          </div>

          <div
            style={{
              height: 9,
              background: '#dbe4f0',
              borderRadius: 10,
              overflow: 'hidden',
              margin: '16px 0',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background: '#173a70',
                transition: 'width 0.3s',
              }}
            />
          </div>

          <p>
            Departure becomes ready after 15 minutes or when
            13 passengers have boarded at this stop.
          </p>

          <button
            type="button"
            onClick={confirm}
            disabled={!departure.requiresDriverConfirmation || confirming}
            style={{
              background: '#173a70',
              color: '#fff',
              padding: '12px 20px',
              border: 0,
              borderRadius: 8,
              fontWeight: 700,
              cursor: departure.requiresDriverConfirmation
                ? 'pointer'
                : 'not-allowed',
              opacity: departure.requiresDriverConfirmation ? 1 : 0.55,
            }}
          >
            {confirming ? 'Confirming...' : 'Confirm Departure'}
          </button>

          {departure.status === 'Awaiting GPS Departure' && (
            <p>
              <CheckCircle2 size={18} style={{ verticalAlign: 'middle' }} />
              {' '}Driver confirmed. Waiting for GPS to verify departure.
            </p>
          )}
        </>
      )}

      {message && <p role="status">{message}</p>}
      {error && <p className="error" role="alert">{error}</p>}

      <p style={{ fontSize: 13, marginTop: 14 }}>
        Only confirm departure while safely stopped.
      </p>
    </section>
  );
}
