import assert from 'node:assert/strict';
import { detectStopArrival } from './src/services/stop-arrival.js';

const now = Date.now();

const stop = {
  lat: -26.1076,
  lng: 28.0567
};

function check(name, gps, expected) {
  const result = detectStopArrival({ gps, stop, now });
  assert.equal(result.arrived, expected, name);
  console.log(`PASS: ${name}`);
}

check('Shuttle at stop', {
  lat: -26.1076,
  lng: 28.0567,
  accuracy: 10,
  updatedAt: new Date(now)
}, true);

check('Shuttle far from stop', {
  lat: -26.094,
  lng: 28.071,
  accuracy: 10,
  updatedAt: new Date(now)
}, false);

check('Stale GPS rejected', {
  lat: -26.1076,
  lng: 28.0567,
  accuracy: 10,
  updatedAt: new Date(now - 60_000)
}, false);

check('Inaccurate GPS rejected', {
  lat: -26.1076,
  lng: 28.0567,
  accuracy: 150,
  updatedAt: new Date(now)
}, false);

check('Invalid GPS rejected', {
  lat: 200,
  lng: 28.0567,
  accuracy: 10,
  updatedAt: new Date(now)
}, false);

console.log('All GPS arrival tests passed.');
