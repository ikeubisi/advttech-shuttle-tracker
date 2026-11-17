import assert from 'node:assert/strict';
import { processStopArrival } from './src/services/process-stop-arrival.js';

function makeClient({ activeVisit = null, trips = [] } = {}) {
  const queries = [];

  return {
    queries,
    async query(sql, params) {
      queries.push(sql);

      if (sql.includes('FROM shuttles') && sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 1, route_id: 1 }],
          rowCount: 1,
        };
      }

      if (sql.includes('FROM shuttles') &&
          !sql.includes('FOR UPDATE')) {
        return {
          rows: [{ id: 1, driver_id: 7 }],
          rowCount: 1,
        };
      }

      if (sql.includes('FROM shuttle_stop_visits')) {
        if (sql.includes('FOR UPDATE')) {
          return {
            rows: activeVisit ? [activeVisit] : [],
            rowCount: activeVisit ? 1 : 0,
          };
        }
        return { rows: [], rowCount: 0 };
      }

      if (sql.includes('FROM locations l')) {
        return {
          rows: [],
          rowCount: 0,
        };
      }

      if (sql.includes('FROM trips t')) {
        return { rows: trips, rowCount: trips.length };
      }

      throw new Error(`Unexpected query: ${sql}`);
    },
  };
}

// Test 1: Existing visit must not restart.
const existingClient = makeClient({
  activeVisit: { id: 10, stop_id: 2, arrived_at: new Date() },
});

const existing = await processStopArrival(existingClient, 1);

assert.equal(existing.arrived, false);
assert.match(existing.reason, /Existing stop visit/);
assert.equal(
  existingClient.queries.some(q => q.includes('FROM trips t')),
  false
);
console.log('PASS: Existing stop visit preserved');

// Test 2: Historical unfinished trip blocks new arrival.
const historicalClient = makeClient({
  trips: [{
    id: 1,
    shuttle_id: 1,
    driver_id: 99,
    onboard_count: 2,
    ended_at: null,
  }],
});

const historical = await processStopArrival(historicalClient, 1);

assert.equal(historical.arrived, false);
assert.equal(historical.requiresReview, true);
assert.match(historical.reason, /driver does not match/);

console.log('PASS: Historical unfinished trip blocks new arrival');

// Test 3: Multiple unfinished trips require review.
const multipleClient = makeClient({
  trips: [
    { id: 1, shuttle_id: 1, onboard_count: 2 },
    { id: 2, shuttle_id: 1, onboard_count: 1 },
  ],
});

const multiple = await processStopArrival(multipleClient, 1);

assert.equal(multiple.arrived, false);
assert.equal(multiple.requiresReview, true);
assert.match(multiple.reason, /Multiple unfinished trips/);

console.log('PASS: Multiple unfinished trips require review');

console.log('All arrival safety integration tests passed.');



