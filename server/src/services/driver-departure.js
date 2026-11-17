import { getAssignedShuttles } from './assigned-shuttle.js';
import { getAssignedDriverGps } from './driver-gps.js';
import { recordVerifiedDeparture } from './record-departure.js';

export async function processDriverDepartures(client, driverId) {
  const shuttles = await getAssignedShuttles(client, driverId);
  const results = [];

  for (const shuttle of shuttles) {
    const visitResult = await client.query(
      `SELECT id, shuttle_id, stop_id, driver_confirmed_at
       FROM shuttle_stop_visits
       WHERE shuttle_id=$1
         AND completed_at IS NULL
       ORDER BY arrived_at DESC
       LIMIT 1
       FOR UPDATE`,
      [shuttle.id],
    );

    if (!visitResult.rowCount) {
      continue;
    }

    const visit = visitResult.rows[0];

    if (!visit.driver_confirmed_at) {
      continue;
    }

    const stopResult = await client.query(
      `SELECT id, lat, lng
       FROM stops
       WHERE id=$1`,
      [visit.stop_id],
    );

    if (!stopResult.rowCount) {
      throw new Error('Stop not found for active visit');
    }

    const { previousGps, currentGps } =
      await getAssignedDriverGps(client, shuttle.id);

    const departure = await recordVerifiedDeparture(client, {
      visitId: visit.id,
      previousGps,
      currentGps,
      stop: stopResult.rows[0],
    });

    if (departure.updated || departure.departedAt) {
      await client.query(
        `UPDATE shuttle_stop_visits
         SET completed_at=COALESCE(completed_at, departed_at)
         WHERE id=$1
           AND departed_at IS NOT NULL
           AND completed_at IS NULL`,
        [visit.id],
      );
    }

    results.push({
      shuttleId: shuttle.id,
      visitId: visit.id,
      ...departure,
    });
  }

  return results;
}
