import assert from 'node:assert/strict';
import { recordVerifiedDeparture } from './src/services/record-departure.js';

const now = Date.now();
const stop = { lat: -26.1076, lng: 28.0567 };

let visit = {
  id: 1,
  driver_confirmed_at: new Date(now - 20_000),
  departed_at: null,
};

let updateCount = 0;

const client = {
  async query(sql, params) {
    if (sql.includes('SELECT id, driver_confirmed_at')) {
      return { rowCount: 1, rows: [{ ...visit }] };
    }

    if (sql.includes('UPDATE shuttle_stop_visits')) {
      updateCount++;
      visit.departed_at = params[1];
      return {
        rowCount: 1,
        rows: [{ departed_at: visit.departed_at }],
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  },
};

function gps(ageMs, lat = -26.104) {
  return {
    lat,
    lng: stop.lng,
    accuracy: 10,
    updatedAt: new Date(now - ageMs),
  };
}

const readings = {
  previousGps: gps(8_000),
  currentGps: gps(2_000),
  stop,
};

const missingConfirmation = visit.driver_confirmed_at;
visit.driver_confirmed_at = null;

const rejected = await recordVerifiedDeparture(client, {
  visitId: 1,
  ...readings,
});

assert.equal(rejected.updated, false);
assert.equal(updateCount, 0);
console.log('PASS: Departure blocked without driver confirmation');

visit.driver_confirmed_at = missingConfirmation;

const recorded = await recordVerifiedDeparture(client, {
  visitId: 1,
  ...readings,
});

assert.equal(recorded.updated, true);
assert.equal(updateCount, 1);
assert.ok(recorded.departedAt);
console.log('PASS: GPS-verified departure recorded');

const duplicate = await recordVerifiedDeparture(client, {
  visitId: 1,
  ...readings,
});

assert.equal(duplicate.updated, false);
assert.equal(updateCount, 1);
console.log('PASS: Duplicate departure prevented');

console.log('All departure recording tests passed.');
