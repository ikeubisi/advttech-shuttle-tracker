import { getActiveTrip } from "./active-trip.js";

export async function completeTripAtDestination(client, shuttleId) {
  const id = Number(shuttleId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid shuttle ID");
  }

  // Caller must use BEGIN/COMMIT on this same client.
  // Serialize completion with passenger boarding.
  const shuttleLock = await client.query(
    `SELECT id FROM shuttles WHERE id=$1 FOR UPDATE`,
    [id],
  );

  if (!shuttleLock.rowCount) {
    throw new Error("Shuttle not found");
  }

  const trips = await getActiveTrip(client, id);

  if (trips.length === 0) {
    return {
      completed: false,
      reason: "No unfinished trip",
    };
  }

  if (trips.length !== 1) {
    return {
      completed: false,
      reason: "Multiple unfinished trips require review",
    };
  }

  const trip = trips[0];

  const visitResult = await client.query(
    `SELECT id, stop_id, arrived_at
     FROM shuttle_stop_visits
     WHERE shuttle_id=$1
       AND stop_id=$2
       AND completed_at IS NULL
       AND arrived_at >= $3
     ORDER BY arrived_at DESC
     LIMIT 1
     FOR UPDATE`,
    [shuttleId, trip.destination_stop_id, trip.started_at],
  );

  if (!visitResult.rowCount) {
    return {
      completed: false,
      reason: "Destination arrival not confirmed",
    };
  }

  const onboardResult = await client.query(
    `SELECT COUNT(*)::int AS count
     FROM passenger_boardings
     WHERE trip_key=$1
       AND exited_at IS NULL`,
    [`trip-${trip.id}`],
  );

  if (Number(onboardResult.rows[0]?.count) !== 0) {
    return {
      completed: false,
      reason: "Passengers are still onboard",
    };
  }

  const result = await client.query(
    `UPDATE trips
     SET ended_at=now()
     WHERE id=$1
       AND ended_at IS NULL
     RETURNING id, ended_at`,
    [trip.id],
  );

  return {
    completed: result.rowCount === 1,
    tripId: trip.id,
    reason: result.rowCount
      ? "Trip completed at destination"
      : "Trip already completed",
  };
}
