import { pool } from '../database/db.js';

export async function getBoardingOverview(user) {
  const result = {
    myBoarding: null,
    counts: {
      onboard: 0,
      boardedToday: 0,
    },
    onboardUsers: [],
  };

  if (user.role === 'passenger') {
    const boarding = await pool.query(
      `
      SELECT
        b.id,
        b.origin_stop_id AS "originStopId",
        b.destination_stop_id AS "destinationStopId",
        b.trip_key AS "tripKey",
        b.boarded_at AS "boardedAt",
        o.name AS "originStop",
        d.name AS "destinationStop"
      FROM passenger_boardings b
      JOIN stops o ON o.id = b.origin_stop_id
      JOIN stops d ON d.id = b.destination_stop_id
      WHERE b.user_id = $1
        AND b.exited_at IS NULL
      ORDER BY b.boarded_at DESC
      LIMIT 1
    `,
      [user.id],
    );

    result.myBoarding = boarding.rows[0] || null;
  }

  if (user.role === 'driver') {
    const onboard = await pool.query(
      `
      SELECT
        u.id,
        u.name AS "displayName",
        b.boarded_at AS "boardedAt",
        o.name AS "originStop",
        d.name AS "destinationStop"
      FROM passenger_boardings b
      JOIN users u ON u.id = b.user_id
      JOIN stops o ON o.id = b.origin_stop_id
      JOIN stops d ON d.id = b.destination_stop_id
      JOIN trips t ON b.trip_key = 'trip-' || t.id::text
      JOIN shuttles s ON s.id = t.shuttle_id
      WHERE s.driver_id = $1
        AND t.driver_id = $1
        AND t.ended_at IS NULL
        AND b.exited_at IS NULL
      ORDER BY b.boarded_at DESC
      `,
      [user.id],
    );

    result.onboardUsers = onboard.rows;
    result.counts.onboard = onboard.rows.length;
  }

  if (user.role === 'admin') {
    const counts = await pool.query(`
      SELECT
        COUNT(*) FILTER (
          WHERE exited_at IS NULL
        )::int AS onboard,
        COUNT(*) FILTER (
          WHERE boarded_at >= CURRENT_DATE
            AND boarded_at < CURRENT_DATE + INTERVAL '1 day'
        )::int AS "boardedToday"
      FROM passenger_boardings
    `);

    result.counts = counts.rows[0];

    const onboard = await pool.query(`
      SELECT
        u.id,
        u.name AS "displayName",
        u.email AS username,
        b.boarded_at AS "boardedAt",
        o.name AS "originStop",
        d.name AS "destinationStop"
      FROM passenger_boardings b
      JOIN users u ON u.id = b.user_id
      JOIN stops o ON o.id = b.origin_stop_id
      JOIN stops d ON d.id = b.destination_stop_id
      WHERE b.exited_at IS NULL
      ORDER BY b.boarded_at DESC
    `);

    result.onboardUsers = onboard.rows;
  }

  return result;
}
