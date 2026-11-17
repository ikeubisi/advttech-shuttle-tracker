import assert from 'node:assert/strict';
import { processStopArrivalTransaction } from './src/services/arrival-transaction.js';

function makePool(fail = false) {
  const commands = [];
  let released = false;

  const client = {
    async query(sql) {
      if (sql === 'BEGIN' || sql === 'COMMIT' || sql === 'ROLLBACK') {
        commands.push(sql);
        return { rows: [] };
      }

      if (fail) {
        throw new Error('Simulated database failure');
      }

      if (sql.includes('FROM shuttles')) {
        return {
          rowCount: 1,
          rows: [{ id: 1, route_id: 1 }]
        };
      }

      if (sql.includes('FROM shuttle_stop_visits')) {
        return {
          rowCount: 1,
          rows: [{
            id: 10,
            stop_id: 2,
            arrived_at: new Date(),
            departed_at: null
          }]
        };
      }

      throw new Error(`Unexpected SQL: ${sql}`);
    },

    release() {
      released = true;
    }
  };

  return {
    pool: {
      async connect() {
        return client;
      }
    },
    commands,
    wasReleased: () => released
  };
}

const success = makePool();

const result = await processStopArrivalTransaction(success.pool, 1);

assert.equal(result.arrived, false);
assert.deepEqual(success.commands, ['BEGIN', 'COMMIT']);
assert.equal(success.wasReleased(), true);

console.log('PASS: Successful transaction commits and releases connection');

const failure = makePool(true);

await assert.rejects(
  () => processStopArrivalTransaction(failure.pool, 1),
  /Simulated database failure/
);

assert.deepEqual(failure.commands, ['BEGIN', 'ROLLBACK']);
assert.equal(failure.wasReleased(), true);

console.log('PASS: Failed transaction rolls back and releases connection');

console.log('All arrival transaction tests passed.');
