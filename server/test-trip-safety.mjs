import assert from 'node:assert/strict';
import { checkTripSafety } from './src/services/trip-safety.js';

const trip = {
  id: 1,
  shuttle_id: 1,
  driver_id: 7,
  onboard_count: 2,
  ended_at: null
};

function makeClient(trips, visits = [], driverId = 7) {
  return {
    async query(sql, params) {
      assert.deepEqual(params, [1]);

      if (sql.includes('FROM trips t')) {
        return { rowCount: trips.length, rows: trips };
      }

      if (sql.includes('FROM shuttles')) {
        return {
          rowCount: 1,
          rows: [{ id: 1, driver_id: driverId }]
        };
      }

      if (sql.includes('FROM shuttle_stop_visits')) {
        return { rowCount: visits.length, rows: visits };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    }
  };
}

const empty = await checkTripSafety(makeClient([]), 1);
assert.equal(empty.safe, true);
console.log('PASS: No unfinished trips');

const unfinished = await checkTripSafety(makeClient([trip]), 1);
assert.equal(unfinished.safe, true);
assert.match(unfinished.reason, /no active stop visit/i);
console.log('PASS: Unfinished trip without active visit accepted');

const multiple = await checkTripSafety(
  makeClient([trip, { ...trip, id: 2 }]), 1
);
assert.equal(multiple.safe, false);
assert.match(multiple.reason, /Multiple unfinished trips/);
console.log('PASS: Multiple unfinished trips blocked');

const wrongDriver = await checkTripSafety(
  makeClient([trip], [], 99), 1
);
assert.equal(wrongDriver.safe, false);
assert.match(wrongDriver.reason, /driver does not match/i);
console.log('PASS: Driver mismatch blocked');

const linked = await checkTripSafety(
  makeClient([trip], [{
    id: 10,
    trip_id: 1,
    stop_id: 2,
    departed_at: null
  }]), 1
);
assert.equal(linked.safe, true);
console.log('PASS: Linked active trip accepted');

const conflicting = await checkTripSafety(
  makeClient([trip], [{
    id: 11,
    trip_id: 2,
    stop_id: 2,
    departed_at: null
  }]), 1
);
assert.equal(conflicting.safe, false);
assert.match(conflicting.reason, /different trip/i);
console.log('PASS: Conflicting stop visit blocked');

console.log('All unfinished-trip safety tests passed.');
