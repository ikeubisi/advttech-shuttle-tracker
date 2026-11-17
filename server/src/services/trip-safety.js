import { getActiveTrip } from './active-trip.js';

export async function checkTripSafety(client, shuttleId) {
  const trips = await getActiveTrip(client, shuttleId);

  if (trips.length === 0) {
    return {
      safe: true,
      reason: 'No unfinished trips',
      trips: [],
    };
  }

  if (trips.length > 1) {
    return {
      safe: false,
      reason: 'Multiple unfinished trips require review',
      trips,
    };
  }

  const trip = trips[0];

  const shuttleResult = await client.query(
    `SELECT id, driver_id
     FROM shuttles
     WHERE id=$1`,
    [shuttleId],
  );

  const shuttle = shuttleResult.rows[0];

  if (!shuttle || !shuttle.driver_id ||
      Number(trip.driver_id) !== Number(shuttle.driver_id)) {
    return {
      safe: false,
      reason: 'Active trip driver does not match assigned shuttle driver',
      trips,
    };
  }

  const visitResult = await client.query(
    `SELECT id, trip_id, stop_id, departed_at
     FROM shuttle_stop_visits
     WHERE shuttle_id=$1
       AND completed_at IS NULL
     LIMIT 1`,
    [shuttleId],
  );

  const visit = visitResult.rows[0];

  if (!visit) {
    return {
      safe: true,
      reason: 'Existing trip has no active stop visit',
      trips,
    };
  }

  if (visit.trip_id !== null &&
      Number(visit.trip_id) !== Number(trip.id)) {
    return {
      safe: false,
      reason: 'Active stop visit belongs to a different trip',
      trips,
    };
  }

  return {
    safe: true,
    reason: 'Active trip and stop visit are compatible',
    trips,
  };
}
