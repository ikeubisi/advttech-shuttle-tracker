import assert from 'node:assert/strict';
import {
  calculateDepartureState,
  WAITING_MINUTES,
  PASSENGER_THRESHOLD,
} from './src/services/departure-rules.js';

const now = Date.now();
const arrivedAt = new Date(now - 5 * 60_000).toISOString();

assert.equal(WAITING_MINUTES, 15);
assert.equal(PASSENGER_THRESHOLD, 13);

const waiting = calculateDepartureState({
  arrivedAt,
  passengerCount: 5,
  now,
});

assert.equal(waiting.status, 'Waiting');
assert.equal(waiting.remainingSeconds, 600);
assert.equal(waiting.ready, false);
console.log('PASS: Five passengers after five minutes remain waiting');

const full = calculateDepartureState({
  arrivedAt,
  passengerCount: 13,
  now,
});

assert.equal(full.ready, true);
assert.equal(full.status, 'Awaiting Driver Confirmation');
assert.equal(full.readyReason, 'passenger_threshold');
console.log('PASS: Thirteen passengers trigger early readiness');

const timeout = calculateDepartureState({
  arrivedAt: new Date(now - 15 * 60_000).toISOString(),
  passengerCount: 5,
  now,
});

assert.equal(timeout.ready, true);
assert.equal(timeout.remainingSeconds, 0);
assert.equal(timeout.readyReason, 'waiting_timeout');
console.log('PASS: Fifteen-minute timeout triggers readiness');

const confirmed = calculateDepartureState({
  arrivedAt,
  passengerCount: 13,
  driverConfirmedAt: new Date(now).toISOString(),
  now,
});

assert.equal(confirmed.status, 'Awaiting GPS Departure');
console.log('PASS: Driver confirmation does not automatically mark departure');

const departed = calculateDepartureState({
  arrivedAt,
  passengerCount: 13,
  driverConfirmedAt: new Date(now - 1000).toISOString(),
  departedAt: new Date(now).toISOString(),
  now,
});

assert.equal(departed.status, 'Departed');
console.log('PASS: Recorded departure changes status to Departed');

console.log('All departure countdown tests passed.');
