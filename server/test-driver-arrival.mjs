import assert from 'node:assert/strict';
import { processDriverArrivals } from './src/services/driver-arrival.js';

const now = Date.now();
const queries = [];

const client = {
  async query(sql, params) {
    queries.push(sql);

    if (sql.includes('WHERE driver_id = $1')) {
      assert.deepEqual(params, [7]);

      return {
        rows: [{
          id: 1,
          route_id: 1,
          driver_id: 7,
          status: 'At Stop'
        }]
      };
    }

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
      return { rowCount: 0, rows: [] };
    }

    if (sql.includes('FROM locations')) {
      assert.match(sql, /JOIN shuttles s ON s\.driver_id = l\.user_id/);

      return {
        rows: [
          {
            id: 102,
            lat: -26.1076,
            lng: 28.0567,
            accuracy: 10,
            updatedAt: new Date(now - 1000)
          },
          {
            id: 101,
            lat: -26.1076,
            lng: 28.0567,
            accuracy: 10,
            updatedAt: new Date(now - 7000)
          }
        ]
      };
    }

    if (sql.includes('FROM stops')) {
      return {
        rowCount: 1,
        rows: [{
          id: 2,
          route_id: 1,
          lat: -26.1076,
          lng: 28.0567
        }]
      };
    }

    if (sql.includes('INSERT INTO shuttle_stop_visits')) {
      return {
        rowCount: 1,
        rows: [{
          id: 10,
          shuttle_id: 1,
          stop_id: 2,
          arrived_at: params[2],
          departed_at: null
        }]
      };
    }

    throw new Error(`Unexpected SQL: ${sql}`);
  }
};

const result = await processDriverArrivals(client, 7);

assert.equal(result.length, 1);
assert.equal(result[0].shuttleId, 1);
assert.equal(result[0].arrived, true);
assert.equal(result[0].stopId, 2);

console.log('PASS: Assigned driver triggers GPS-confirmed arrival');

const emptyClient = {
  async query(sql) {
    assert.match(sql, /WHERE driver_id = \$1/);
    return { rows: [] };
  }
};

const empty = await processDriverArrivals(emptyClient, 7);

assert.deepEqual(empty, []);

console.log('PASS: Unassigned driver creates no stop visits');
console.log('All driver arrival integration tests passed.');



