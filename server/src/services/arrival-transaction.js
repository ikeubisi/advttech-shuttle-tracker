import { processStopArrival } from './process-stop-arrival.js';

export async function processStopArrivalTransaction(pool, shuttleId) {
  const client = await pool.connect();
  let transactionStarted = false;

  try {
    await client.query('BEGIN');
    transactionStarted = true;

    const result = await processStopArrival(client, shuttleId);

    await client.query('COMMIT');
    transactionStarted = false;

    return result;
  } catch (error) {
    if (transactionStarted) {
      try {
        await client.query('ROLLBACK');
      } catch (rollbackError) {
        console.error('Arrival transaction rollback failed:', rollbackError);
      }
    }

    throw error;
  } finally {
    client.release();
  }
}
