import { confirmStopDeparture } from "./stop-departure.js";

export async function recordVerifiedDeparture(
  client,
  { visitId, previousGps, currentGps, stop },
) {
  const id = Number(visitId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid stop visit ID");
  }

  // Lock the stop visit to prevent duplicate departure updates.
  const result = await client.query(
    `SELECT id, driver_confirmed_at, departed_at
     FROM shuttle_stop_visits
     WHERE id=$1
     FOR UPDATE`,
    [id],
  );

  if (!result.rowCount) {
    throw new Error("Stop visit not found");
  }

  const visit = result.rows[0];

  if (visit.departed_at) {
    return {
      updated: false,
      departedAt: visit.departed_at,
      reason: "Departure already recorded",
    };
  }

  if (!visit.driver_confirmed_at) {
    return {
      updated: false,
      departedAt: null,
      reason: "Driver confirmation required",
    };
  }

  const verification = confirmStopDeparture({
    previousGps,
    currentGps,
    stop,
    driverConfirmedAt: visit.driver_confirmed_at,
  });

  if (!verification.confirmed) {
    return {
      updated: false,
      departedAt: null,
      reason: verification.reason,
    };
  }

  const updated = await client.query(
    `UPDATE shuttle_stop_visits
     SET departed_at=$2
     WHERE id=$1 AND departed_at IS NULL
     RETURNING departed_at`,
    [id, verification.departedAt],
  );

  return {
    updated: updated.rowCount > 0,
    departedAt: updated.rows[0]?.departed_at ?? null,
    reason: "GPS-verified departure recorded",
  };
}
