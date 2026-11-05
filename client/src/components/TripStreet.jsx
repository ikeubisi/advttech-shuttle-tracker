import React, { useEffect, useState } from 'react';
const streetCache = new Map();
let streetLookupQueue = Promise.resolve();
let streetLookupLast = 0;

export default function TripStreet({ lat, lng }) {
  const [name, setName] = useState('');

  useEffect(() => {
    const latitude = Number(lat);
    const longitude = Number(lng);

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setName('Location unavailable');
      return;
    }

    const key = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;

    if (streetCache.has(key)) {
      setName(streetCache.get(key));
      return;
    }

    let cancelled = false;
    setName('Finding street name...');

    streetLookupQueue = streetLookupQueue
      .catch(() => {})
      .then(async () => {
        if (cancelled) return;

        const wait = Math.max(0, 1100 - (Date.now() - streetLookupLast));
        if (wait) await new Promise((resolve) => setTimeout(resolve, wait));
        if (cancelled) return;

        streetLookupLast = Date.now();

        try {
          const response = await fetch(
            `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}&zoom=16&addressdetails=1`,
          );

          if (!response.ok) throw new Error('Lookup failed');

          const result = await response.json();
          const a = result.address || {};

          const road = a.road || a.pedestrian || a.residential || a.neighbourhood || a.suburb;
          const area = a.suburb || a.city_district || a.city || a.town;

          const location = road
            ? [road, area && area !== road ? area : null].filter(Boolean).join(', ')
            : 'Street name unavailable';

          streetCache.set(key, location);
          if (!cancelled) setName(location);
        } catch {
          if (!cancelled) setName('Street name unavailable');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [lat, lng]);

  return (
    <span>
      {name || 'Finding street name...'}
      <small style={{ display: 'block', opacity: 0.7 }}>
        {Number(lat).toFixed(5)}, {Number(lng).toFixed(5)}
      </small>
    </span>
  );
}
