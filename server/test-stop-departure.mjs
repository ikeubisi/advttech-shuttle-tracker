import assert from 'node:assert/strict';
import { confirmStopDeparture } from './src/services/stop-departure.js';

const now = Date.now();
const stop = { lat: -26.1076, lng: 28.0567 };
const driverConfirmedAt = new Date(now - 20_000);

function gps(ageMs, lat = -26.104, lng = 28.0567, accuracy = 10) {
  return {
    lat,
    lng,
    accuracy,
    updatedAt: new Date(now - ageMs)
  };
}

function check(name, previousGps, currentGps, confirmation, expected) {
  const result = confirmStopDeparture({
    previousGps,
    currentGps,
    stop,
    driverConfirmedAt: confirmation,
    now
  });

  assert.equal(result.confirmed, expected, name);
  console.log(`PASS: ${name}`);
}

check(
  'Two valid GPS readings confirm departure',
  gps(8_000),
  gps(2_000),
  driverConfirmedAt,
  true
);

check(
  'No driver confirmation prevents departure',
  gps(8_000),
  gps(2_000),
  null,
  false
);

check(
  'Shuttle still at stop',
  gps(8_000, stop.lat, stop.lng),
  gps(2_000, stop.lat, stop.lng),
  driverConfirmedAt,
  false
);

check(
  'GPS readings too close together',
  gps(4_000),
  gps(2_000),
  driverConfirmedAt,
  false
);

check(
  'Stale GPS prevents departure',
  gps(60_000),
  gps(2_000),
  driverConfirmedAt,
  false
);

check(
  'GPS readings before driver confirmation',
  gps(18_000),
  gps(12_000),
  new Date(now - 10_000),
  false
);

console.log('All GPS departure verification tests passed.');
