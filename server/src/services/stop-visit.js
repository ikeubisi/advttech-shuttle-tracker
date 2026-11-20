export async function startStopVisit(client, { shuttleId, stopId, arrivedAt }) {
  const shuttle = Number(shuttleId);
  const stop = Number(stopId);
  const arrival = new Date(arrivedAt);

  if (
    !Number.isSafeInteger(shuttle) ||
    shuttle <= 0 ||
    !Number.isSafeInteger(stop) ||
    stop <= 0 ||
    !Number.isFinite(arrival.getTime())
  ) {
    throw new Error("Invalid stop visit information");
  }

  // The caller must already have confirmed arrival using
  // fresh GPS readings from the assigned shuttle driver.
  // Lock the shuttle to serialize concurrent arrival updates.
  const locked = await client.query(
    "SELECT id, route_id FROM shuttles WHERE id=$1 FOR UPDATE",
    [shuttle],
  );

  if (!locked.rowCount) {
    throw new Error("Shuttle not found");
  }

  const stopResult = await client.query(
    "SELECT id FROM stops WHERE id=$1 AND route_id=$2",
    [stop, locked.rows[0].route_id],
  );

  if (!stopResult.rowCount) {
    throw new Error("Stop does not belong to shuttle route");
  }

  const existing = await client.query(
    `SELECT *
     FROM shuttle_stop_visits
     WHERE shuttle_id=$1 AND completed_at IS NULL
     LIMIT 1
     FOR UPDATE`,
    [shuttle],
  );

  if (existing.rowCount) {
    return {
      created: false,
      visit: existing.rows[0],
    };
  }

  const inserted = await client.query(
    `INSERT INTO shuttle_stop_visits (
       shuttle_id, stop_id, arrived_at
     )
     VALUES ($1, $2, $3)
     RETURNING *`,
    [shuttle, stop, arrival],
  );

  return {
    created: true,
    visit: inserted.rows[0],
  };
}
