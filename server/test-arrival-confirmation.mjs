import assert from 'node:assert/strict';
import { confirmStopArrival } from './src/services/stop-arrival.js';

const now = Date.now();

const stop = {
  lat: -26.1076,
  lng: 28.0567
};

function gps(ageMs, lat = stop.lat, lng = stop.lng) {
  return {
    lat,
    lng,
    accuracy: 10,
    updatedAt: new Date(now - ageMs)
  };
}

function check(name, previousGps, currentGps, expected) {
  const result = confirmStopArrival({
    previousGps,
    currentGps,
    stop,
    now
  });

  assert.equal(result.confirmed, expected, name);
  console.log(`PASS: ${name}`);
}

check(
  'Two valid readings 6 seconds apart',
  gps(8_000),
  gps(2_000),
  true
);

check(
  'Readings only 2 seconds apart',
  gps(4_000),
  gps(2_000),
  false
);

check(
  'Previous GPS reading is stale',
  gps(60_000),
  gps(2_000),
  false
);

check(
  'Previous reading is outside stop radius',
  gps(8_000, -26.094, 28.071),
  gps(2_000),
  false
);

check(
  'Readings are in the wrong time order',
  gps(2_000),
  gps(8_000),
  false
);

console.log('All GPS arrival confirmation tests passed.');
