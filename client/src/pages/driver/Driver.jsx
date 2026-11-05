import React, { useEffect, useState, useRef } from 'react';
import { MapPin, CheckCircle2, Info } from 'lucide-react';
import { api } from '../../services/api.js';
import ShuttleMap from '../../components/ShuttleMap.jsx';

import StatusButtons from '../../components/StatusButtons.jsx';
import GPSButton from '../../components/GPSButton.jsx';
export default function Driver({ data, reload }) {
  const [sharing, setSharing] = useState(false);
  const [gpsStatus, setGpsStatus] = useState('off');
  const [error, setError] = useState('');
  const [lastSent, setLastSent] = useState(null);
  const [streetName, setStreetName] = useState('');
  const lastLookup = useRef(0);
  const watch = useRef(null);

  useEffect(() => {
    const gps = data?.location;
    if (!gps?.lat || !gps?.lng) {
      setStreetName('');
      return;
    }

    const now = Date.now();
    if (now - lastLookup.current < 60000) return;
    lastLookup.current = now;

    const controller = new AbortController();

    fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${encodeURIComponent(gps.lat)}&lon=${encodeURIComponent(gps.lng)}&zoom=16&addressdetails=1`,
      { signal: controller.signal },
    )
      .then((r) => {
        if (!r.ok) throw new Error('Street lookup unavailable');
        return r.json();
      })
      .then((result) => {
        const a = result.address || {};
        setStreetName(
          a.road ||
            a.pedestrian ||
            a.residential ||
            a.suburb ||
            a.neighbourhood ||
            'Street name unavailable',
        );
      })
      .catch((e) => {
        if (e.name !== 'AbortError') setStreetName('Street name unavailable');
      });

    return () => controller.abort();
  }, [data?.location?.lat, data?.location?.lng]);
  const active = useRef(false);

  function stopSharing() {
    active.current = false;
    if (watch.current !== null) {
      navigator.geolocation?.clearWatch(watch.current);
      watch.current = null;
    }
    setSharing(false);
    setGpsStatus('off');
  }

  useEffect(
    () => () => {
      active.current = false;
      if (watch.current !== null) navigator.geolocation?.clearWatch(watch.current);
    },
    [],
  );

  function toggle() {
    if (sharing) {
      stopSharing();
      return;
    }

    if (!navigator.geolocation) {
      setError('Geolocation is not supported on this device.');
      setGpsStatus('error');
      return;
    }

    setError('');
    setLastSent(null);
    setGpsStatus('waiting');
    setSharing(true);
    active.current = true;

    watch.current = navigator.geolocation.watchPosition(
      async (p) => {
        if (!active.current) return;
        try {
          await api('/driver/location', {
            method: 'POST',
            body: JSON.stringify({
              lat: p.coords.latitude,
              lng: p.coords.longitude,
              accuracy: p.coords.accuracy,
            }),
          });

          if (!active.current) return;
          setLastSent(new Date().toLocaleTimeString());
          setGpsStatus('active');
          setError('');
          reload();
        } catch (e) {
          if (!active.current) return;
          setGpsStatus('error');
          setError('GPS upload failed: ' + e.message);
        }
      },
      (e) => {
        if (!active.current) return;
        setGpsStatus('error');
        setError('Android GPS error: ' + e.message);
      },
      {
        enableHighAccuracy: true,
        maximumAge: 0,
        timeout: 20000,
      },
    );
  }

  async function status(s) {
    try {
      await api('/driver/status', {
        method: 'POST',
        body: JSON.stringify({ status: s }),
      });
      reload();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <main className="driver content">
      <h1>Driver GPS Sharing</h1>
      <p>Share this device's actual GPS position with signed-in passengers.</p>

      <h3>Shuttle Status</h3>
      <StatusButtons data={data} onStatus={status} />

      <GPSButton sharing={sharing} onToggle={toggle} />

      <div className={'gps-message ' + (gpsStatus === 'active' ? 'active' : '')}>
        <CheckCircle2 size={24} />
        <div>
          <b>
            {gpsStatus === 'off'
              ? 'GPS Sharing OFF'
              : gpsStatus === 'waiting'
                ? 'Waiting for Android GPS'
                : gpsStatus === 'active'
                  ? 'GPS Upload Successful'
                  : 'GPS Sharing Error'}
          </b>
          <small>
            {lastSent
              ? 'Last successful upload: ' + lastSent
              : 'Waiting for a confirmed location upload'}
          </small>
        </div>
      </div>

      {error && <p className="error">{error}</p>}



      <section className="panel" style={{ marginTop: 20 }}>
        <h3>Passengers On Board ({data?.counts?.onboard ?? 0})</h3>
        <p>Registered passengers currently travelling on your shuttle.</p>

        {!data?.onboardUsers?.length ? (
          <p>No passengers currently on board.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: 12, textAlign: 'left' }}>Registered Name</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Boarding Stop</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Destination</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Boarding Time</th>
                  <th style={{ padding: 12, textAlign: 'left' }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {data.onboardUsers.map((passenger) => (
                  <tr key={passenger.id}>
                    <td style={{ padding: 12 }}>{passenger.displayName}</td>
                    <td style={{ padding: 12 }}>{passenger.originStop}</td>
                    <td style={{ padding: 12 }}>{passenger.destinationStop}</td>
                    <td style={{ padding: 12 }}>
                      {new Date(passenger.boardedAt).toLocaleTimeString()}
                    </td>
                    <td style={{ padding: 12 }}>On board</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section className="panel driver-map-panel">
        <h3>Live Shuttle Location</h3>
        <p>View your current GPS position on the map.</p>
        <ShuttleMap data={data} />
      </section>

      <p className="safety">
        <Info size={20} />
        Keep this page open while driving. Use a mounted device and do not operate it while the
        vehicle is moving.
      </p>

      <div className="location-box">
        <MapPin size={30} />
        <div>
          <b>Current Location</b>
          <div style={{ marginTop: 6, fontWeight: 600 }}>
            {data?.location ? streetName || 'Finding street name...' : 'Waiting for GPS signal'}
          </div>
          <small>
            {data?.location
              ? `Lat: ${Number(data.location.lat).toFixed(5)}, Lng: ${Number(data.location.lng).toFixed(5)}`
              : 'GPS coordinates unavailable'}
          </small>
        </div>
      </div>
    </main>
  );
}
