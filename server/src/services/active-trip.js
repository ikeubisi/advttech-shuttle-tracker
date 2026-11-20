export async function getActiveTrip(client, shuttleId) {
  const id = Number(shuttleId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error("Invalid shuttle ID");
  }

  const result = await client.query(
    `SELECT
       t.id,
       t.shuttle_id,
       t.driver_id,
       t.origin_stop_id,
       t.destination_stop_id,
       t.started_at,
       t.ended_at,
       (
         SELECT COUNT(*)::int
         FROM passenger_boardings b
         WHERE b.trip_key = 'trip-' || t.id::text
           AND b.exited_at IS NULL
       ) AS onboard_count
     FROM trips t
     WHERE t.shuttle_id = $1
       AND t.ended_at IS NULL
     ORDER BY t.started_at DESC, t.id DESC`,
    [id],
  );

  return result.rows;
}
