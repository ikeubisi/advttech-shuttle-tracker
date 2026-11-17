export async function getAssignedDriverGps(client, shuttleId) {
  const id = Number(shuttleId);

  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new Error('Invalid shuttle ID');
  }

  const result = await client.query(
    `SELECT
       l.id,
       l.lat,
       l.lng,
       l.accuracy,
       l.created_at AS "updatedAt"
     FROM locations l
     JOIN shuttles s ON s.driver_id = l.user_id
     WHERE s.id = $1
     ORDER BY l.created_at DESC, l.id DESC
     LIMIT 2`,
    [id],
  );

  return {
    currentGps: result.rows[0] ?? null,
    previousGps: result.rows[1] ?? null,
  };
}
