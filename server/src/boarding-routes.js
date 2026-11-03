import { Router } from 'express';
import { pool } from './db.js';
import { verifyGps, validCoordinates } from './boarding-gps.js';

export const boardingRouter = Router();

function passengerOnly(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ error: 'Please sign in' });
  }

  if (req.user.role !== 'passenger') {
    return res.status(403).json({ error: 'Passenger access only' });
  }

  next();
}

function gpsInput(body) {
  const { lat, lng, accuracy, timestamp } = body || {};

  if (
    !validCoordinates(lat, lng) ||
    typeof accuracy !== 'number' ||
    !Number.isFinite(accuracy) ||
    typeof timestamp !== 'number' ||
    !Number.isFinite(timestamp)
  ) {
    return null;
  }

  return { lat, lng, accuracy, timestamp };
}

async function latestShuttleGps(client, driverId) {
  const result = await client.query(`
    SELECT lat, lng, accuracy, created_at AS "updatedAt"
    FROM locations
    WHERE user_id = $1
    ORDER BY created_at DESC
    LIMIT 1
  `, [driverId]);

  const gps = result.rows[0];

  return gps ? {
    lat: Number(gps.lat),
    lng: Number(gps.lng),
    accuracy: gps.accuracy === null ? null : Number(gps.accuracy),
    updatedAt: gps.updatedAt
  } : null;
}

async function stopById(client, stopId) {
  const result = await client.query(
    'SELECT id, route_id, lat, lng, stop_order FROM stops WHERE id=$1',
    [stopId]
  );

  const stop = result.rows[0];

  return stop ? {
    ...stop,
    lat: Number(stop.lat),
    lng: Number(stop.lng)
  } : null;
}

boardingRouter.post('/board', passengerOnly, async (req, res, next) => {
  const passenger = gpsInput(req.body);
  const stopId = Number(req.body?.stopId);

  if (!passenger || !Number.isSafeInteger(stopId) || stopId <= 0) {
    return res.status(400).json({ error: 'Invalid boarding request' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const shuttleResult = await client.query(`
      SELECT id, route_id, driver_id, status
      FROM shuttles
      WHERE route_id = (
        SELECT route_id FROM stops WHERE id=$1
      )
      ORDER BY id
      LIMIT 1
      FOR UPDATE
    `, [stopId]);

    const shuttle = shuttleResult.rows[0];

    if (!shuttle || !shuttle.driver_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No assigned shuttle available' });
    }

    if (shuttle.status === 'Out of Service') {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Shuttle is out of service' });
    }

    const stop = await stopById(client, stopId);
    const shuttleGps = await latestShuttleGps(client, shuttle.driver_id);

    if (!stop || !shuttleGps) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Stop or shuttle GPS unavailable' });
    }

    const verification = verifyGps({
      passenger,
      shuttle: shuttleGps,
      stop
    });

    if (!verification.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: verification.error });
    }

    const active = await client.query(`
      SELECT id
      FROM passenger_boardings
      WHERE user_id=$1 AND exited_at IS NULL
      LIMIT 1
    `, [req.user.id]);

    if (active.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You are already onboard' });
    }

    const destinationResult = await client.query(`
      SELECT id
      FROM stops
      WHERE route_id=$1 AND id<>$2
      ORDER BY ABS(stop_order - $3), stop_order
      LIMIT 1
    `, [stop.route_id, stop.id, stop.stop_order]);

    if (!destinationResult.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'No destination stop configured' });
    }

    let trip = await client.query(`
      SELECT id, origin_stop_id, destination_stop_id
      FROM trips
      WHERE shuttle_id=$1 AND ended_at IS NULL
      ORDER BY started_at DESC
      LIMIT 1
    `, [shuttle.id]);

    if (trip.rowCount) {
      if (
        Number(trip.rows[0].origin_stop_id) !== Number(stop.id) ||
        Number(trip.rows[0].destination_stop_id) !==
          Number(destinationResult.rows[0].id)
      ) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'The shuttle has an active trip in another direction'
        });
      }
    } else {
      trip = await client.query(`
        INSERT INTO trips(
          shuttle_id,
          driver_id,
          origin_stop_id,
          destination_stop_id,
          started_at
        )
        VALUES($1,$2,$3,$4,now())
        RETURNING id, origin_stop_id, destination_stop_id
      `, [
        shuttle.id,
        shuttle.driver_id,
        stop.id,
        destinationResult.rows[0].id
      ]);
    }

    const tripKey = `trip-${trip.rows[0].id}`;

    const boarding = await client.query(`
      INSERT INTO passenger_boardings(
        user_id, origin_stop_id, destination_stop_id, trip_key
      )
      VALUES($1,$2,$3,$4)
      RETURNING id, boarded_at AS "boardedAt"
    `, [
      req.user.id,
      stop.id,
      destinationResult.rows[0].id,
      tripKey
    ]);

    await client.query('COMMIT');

    res.status(201).json({
      ok: true,
      message: 'Boarding confirmed',
      boarding: boarding.rows[0],
      tripKey
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});

boardingRouter.post('/exit', passengerOnly, async (req, res, next) => {
  const passenger = gpsInput(req.body);

  if (!passenger) {
    return res.status(400).json({ error: 'Invalid GPS request' });
  }

  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const active = await client.query(`
      SELECT b.id, b.destination_stop_id, b.trip_key,
             t.shuttle_id, s.driver_id
      FROM passenger_boardings b
      JOIN trips t ON b.trip_key = 'trip-' || t.id::text
      JOIN shuttles s ON s.id=t.shuttle_id
      WHERE b.user_id=$1 AND b.exited_at IS NULL
      LIMIT 1
      FOR UPDATE OF b
    `, [req.user.id]);

    if (!active.rowCount) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'You are not currently onboard' });
    }

    const boarding = active.rows[0];

    const stop = await stopById(client, boarding.destination_stop_id);
    const shuttleGps = await latestShuttleGps(client, boarding.driver_id);

    if (!stop || !shuttleGps) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Destination GPS unavailable' });
    }

    const verification = verifyGps({
      passenger,
      shuttle: shuttleGps,
      stop
    });

    if (!verification.ok) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: verification.error });
    }

    await client.query(`
      UPDATE passenger_boardings
      SET exited_at=now()
      WHERE id=$1
    `, [boarding.id]);

    const remaining = await client.query(`
      SELECT COUNT(*)::int AS count
      FROM passenger_boardings
      WHERE trip_key=$1 AND exited_at IS NULL
    `, [boarding.trip_key]);

    // Do not close the trip when the last passenger exits.
    // A separate automatic trip-ending rule will handle closure.
    // This allows the shuttle to continue accepting passengers.

    await client.query('COMMIT');

    res.json({
      ok: true,
      message: 'Exit confirmed'
    });
  } catch (error) {
    await client.query('ROLLBACK');
    next(error);
  } finally {
    client.release();
  }
});
