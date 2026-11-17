import assert from 'node:assert/strict';
import { processStopArrival } from './src/services/process-stop-arrival.js';

const now = Date.now();
const stop = { id: 2, route_id: 1, lat: -26.1000, lng: 28.0500 };

const previousGps = {
  id: 101,
  lat: stop.lat,
  lng: stop.lng,
  accuracy: 10,
  updatedAt: new Date(now - 12000).toISOString(),
};

const currentGps = {
  id: 102,
  lat: stop.lat,
  lng: stop.lng,
  accuracy: 10,
  updatedAt: new Date(now - 2000).toISOString(),
};

let insertedVisit = null;
let insertCount = 0;

const client = {
  async query(sql, params) {
    if (sql.includes('FROM shuttles') && sql.includes('FOR UPDATE')) {
      return { rows: [{ id: 1, route_id: 1 }], rowCount: 1 };
    }

    if (sql.includes('FROM shuttle_stop_visits')) {
      return {
        rows: insertedVisit ? [insertedVisit] : [],
        rowCount: insertedVisit ? 1 : 0,
      };
    }

    if (sql.includes('FROM trips t')) {
      return { rows: [], rowCount: 0 };
    }

    if (sql.includes('FROM locations l')) {
      return {
        rows: [currentGps, previousGps],
        rowCount: 2,
      };
    }

    if (sql.includes('FROM stops')) {
      return { rows: [stop], rowCount: 1 };
    }

    if (sql.includes('INSERT INTO shuttle_stop_visits')) {
      insertCount++;
      insertedVisit = {
        id: 10,
        shuttle_id: params[0],
        stop_id: params[1],
        arrived_at: params[2],
        completed_at: null,
      };
      return { rows: [insertedVisit], rowCount: 1 };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  },
};

const result = await processStopArrival(client, 1);

assert.equal(result.arrived, true);
assert.equal(result.stopId, stop.id);
assert.equal(result.visit.created, true);
assert.equal(insertCount, 1);
assert.equal(
  new Date(insertedVisit.arrived_at).getTime(),
  new Date(currentGps.updatedAt).getTime()
);

console.log('PASS: GPS-confirmed arrival detected');
console.log('PASS: Stop visit created exactly once');
console.log('PASS: Arrival timestamp recorded correctly');

const second = await processStopArrival(client, 1);

assert.equal(second.arrived, false);
assert.match(second.reason, /Existing stop visit/);
assert.equal(insertCount, 1);

console.log('PASS: Repeated GPS does not restart stop visit');
console.log('All successful-arrival tests passed.');
