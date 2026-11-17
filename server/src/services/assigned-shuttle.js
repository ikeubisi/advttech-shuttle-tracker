export async function getAssignedShuttles(client, driverId) {
  const id = Number(driverId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Invalid driver ID');
  }

  const result = await client.query(
    `SELECT id, route_id, driver_id, status
     FROM shuttles
     WHERE driver_id = $1
     ORDER BY id`,
    [id],
  );

  return result.rows;
}
