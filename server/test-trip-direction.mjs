import assert from 'node:assert/strict';
import { detectTripDirection } from './src/trip-direction.js';

const stops = [
  { id: 1, name: 'Sandton Gautrain Station' },
  { id: 2, name: 'ADvTECH 1 Waterstone' }
];

const outbound = detectTripDirection(1, stops);

assert.equal(outbound.destinationStopId, 2);
console.log('PASS: Sandton to Waterstone');

const inbound = detectTripDirection(2, stops);

assert.equal(inbound.destinationStopId, 1);
console.log('PASS: Waterstone to Sandton');

assert.throws(() => detectTripDirection(99, stops));
console.log('PASS: Unknown stop rejected');

console.log('ALL DIRECTION TESTS PASSED');
