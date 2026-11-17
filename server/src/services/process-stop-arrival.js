import { getAssignedDriverGps } from './driver-gps.js';
import { confirmStopArrival } from './stop-arrival.js';
import { startStopVisit } from './stop-visit.js';
import { checkTripSafety } from './trip-safety.js';

export async function processStopArrival(client, shuttleId) {
  const shuttleResult = await client.query(
    `SELECT id, route_id
     FROM shuttles
     WHERE id=$1
     FOR UPDATE`,
    [shuttleId],
  );

  const shuttle = shuttleResult.rows[0];

  if (!shuttle) {
    throw new Error('Shuttle not found');
  }

  const activeResult = await client.query(
    `SELECT id, stop_id, arrived_at, departed_at
     FROM shuttle_stop_visits
     WHERE shuttle_id=$1 AND completed_at IS NULL
     FOR UPDATE`,
    [shuttle.id],
  );

  if (activeResult.rows.length) {
    return {
      arrived: false,
      reason: 'Existing stop visit must be completed first',
      visit: activeResult.rows[0],
    };
  }

  const safety = await checkTripSafety(client, shuttle.id);

  if (!safety.safe) {
    return {
      arrived: false,
      reason: safety.reason,
      requiresReview: true,
    };
  }

  const { previousGps, currentGps } =
    await getAssignedDriverGps(client, shuttle.id);

  if (!previousGps || !currentGps) {
    return {
      arrived: false,
      reason: 'Two driver GPS readings required',
    };
  }

  const stopsResult = await client.query(
    `SELECT id, route_id, lat, lng
     FROM stops
     WHERE route_id=$1
     ORDER BY stop_order`,
    [shuttle.route_id],
  );

  const lastVisitResult = await client.query(
    `SELECT stop_id
     FROM shuttle_stop_visits
     WHERE shuttle_id=$1
       AND completed_at IS NOT NULL
     ORDER BY completed_at DESC, id DESC
     LIMIT 1`,
    [shuttle.id],
  );

  const lastCompletedStopId = lastVisitResult.rows[0]?.stop_id;

  for (const stop of stopsResult.rows) {
    if (
      lastCompletedStopId != null &&
      Number(stop.id) === Number(lastCompletedStopId)
    ) {
      continue;
    }

    const confirmation = confirmStopArrival({
      previousGps,
      currentGps,
      stop,
    });

    if (!confirmation.confirmed) continue;

    const visit = await startStopVisit(client, {
      shuttleId: shuttle.id,
      stopId: stop.id,
      arrivedAt: confirmation.arrivedAt,
    });

    return {
      arrived: true,
      stopId: stop.id,
      visit,
      reason: 'GPS-confirmed stop arrival',
    };
  }

  return {
    arrived: false,
    reason: 'Shuttle has not arrived at a route stop',
  };
}
