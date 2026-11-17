import assert from 'node:assert/strict';
import { processStopArrival } from './src/services/process-stop-arrival.js';

const now = Date.now();
const stop = {
  id: 2,
  route_id: 1,
  lat: -26.1076,
  lng: 28.0567
};

let activeVisit = null;
let insertCount = 0;

const client = {
  async query(sql, params) {
    if (sql.includes('FROM trips t')) {
      return {
        rowCount: 0,
        rows: []
      };
    }

    if (sql.includes('FROM shuttles')) {
      return {
        rowCount: 1,
        rows: [{ id: 1, route_id: 1 }]
      };
    }

    if (
      sql.includes('FROM shuttle_stop_visits') &&
      sql.includes('completed_at IS NOT NULL')
    ) {
      return {
        rowCount: 0,
        rows: []
      };
    }
    if (sql.includes('FROM shuttle_stop_visits')) {
      return {
        rowCount: activeVisit ? 1 : 0,
        rows: activeVisit ? [activeVisit] : []
      };
    }

    if (sql.includes('FROM locations')) {
      return {
        rowCount: 2,
        rows: [
          {
            id: 102,
            lat: stop.lat,
            lng: stop.lng,
            accuracy: 10,
            updatedAt: new Date(now - 1000)
          },
          {
            id: 101,
            lat: stop.lat,
            lng: stop.lng,
            accuracy: 10,
            updatedAt: new Date(now - 7000)
          }
        ]
      };
    }

    if (sql.includes('FROM stops')) {
      return {
        rowCount: 1,
        rows: [stop]
      };
    }

    if (sql.includes('INSERT INTO shuttle_stop_visits')) {
      insertCount++;
      activeVisit = {
        id: 1,
        shuttle_id: 1,
        stop_id: 2,
        arrived_at: params[2],
        departed_at: null
      };

      return {
        rowCount: 1,
        rows: [activeVisit]
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
};

const first = await processStopArrival(client, 1);

assert.equal(first.arrived, true);
assert.equal(first.stopId, 2);
assert.equal(insertCount, 1);

console.log('PASS: GPS-confirmed arrival creates stop visit');

const originalArrival = activeVisit.arrived_at;

const second = await processStopArrival(client, 1);

assert.equal(second.arrived, false);
assert.equal(insertCount, 1);
assert.equal(activeVisit.arrived_at, originalArrival);

console.log('PASS: Repeated GPS does not restart countdown');

console.log('All automatic stop arrival tests passed.');


