import { calculateDepartureState } from "./departure-rules.js";

export async function getDepartureState(client, shuttleId) {
  const shuttleIdNumber = Number(shuttleId);

  if (!Number.isSafeInteger(shuttleIdNumber) || shuttleIdNumber <= 0) {
    throw new Error("Invalid shuttle ID");
  }

  // Serialize updates for this shuttle to avoid conflicting readiness writes.
  const shuttleResult = await client.query(
    "SELECT id FROM shuttles WHERE id=$1 FOR UPDATE",
    [shuttleIdNumber],
  );

  if (!shuttleResult.rowCount) {
    return null;
  }

  const visitResult = await client.query(
    `SELECT *
     FROM shuttle_stop_visits
     WHERE shuttle_id=$1 AND completed_at IS NULL
     ORDER BY arrived_at DESC
     LIMIT 1
     FOR UPDATE`,
    [shuttleIdNumber],
  );

  if (!visitResult.rowCount) {
    return null;
  }

  const visit = visitResult.rows[0];

  // Count distinct passengers who boarded this trip at this stop
  // during the current visit. Do not count unrelated historical trips.
  const countResult = await client.query(
    `SELECT COUNT(DISTINCT user_id)::int AS count
     FROM passenger_boardings
     WHERE trip_key=$1
       AND origin_stop_id=$2
       AND boarded_at >= $3`,
    [
      visit.trip_id === null ? "__no_trip__" : `trip-${visit.trip_id}`,
      visit.stop_id,
      visit.arrived_at,
    ],
  );

  const passengerCount = countResult.rows[0].count;

  let state = calculateDepartureState({
    arrivedAt: visit.arrived_at,
    passengerCount,
    readyAt: visit.ready_at,
    driverConfirmedAt: visit.driver_confirmed_at,
    departedAt: visit.departed_at,
  });

  if (state.ready && !visit.ready_at) {
    const updated = await client.query(
      `UPDATE shuttle_stop_visits
       SET ready_at=now(), ready_reason=$2
       WHERE id=$1 AND ready_at IS NULL
       RETURNING ready_at, ready_reason`,
      [visit.id, state.readyReason],
    );

    if (updated.rowCount) {
      visit.ready_at = updated.rows[0].ready_at;
      visit.ready_reason = updated.rows[0].ready_reason;
    }

    state = calculateDepartureState({
      arrivedAt: visit.arrived_at,
      passengerCount,
      readyAt: visit.ready_at,
      driverConfirmedAt: visit.driver_confirmed_at,
      departedAt: visit.departed_at,
    });
  }

  return {
    visitId: visit.id,
    shuttleId: visit.shuttle_id,
    stopId: visit.stop_id,
    tripId: visit.trip_id,
    arrivedAt: visit.arrived_at,
    readyAt: visit.ready_at,
    readyReason: visit.ready_reason,
    driverConfirmedAt: visit.driver_confirmed_at,
    departedAt: visit.departed_at,
    ...state,
    readyReason: visit.ready_reason ?? state.readyReason,
  };
}

export async function getDepartureStateWithTransaction(pool, shuttleId) {
  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const state = await getDepartureState(client, shuttleId);

    await client.query("COMMIT");

    return state;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}
