export function registerShuttleRestoration(app, { auth, role, wrap, pool }) {
  app.post(
    '/api/admin/restore-shuttle',
    auth,
    role('admin'),
    wrap(async (req, res) => {
      // Require an explicit confirmation in the request body.
      if (req.body?.confirm !== 'RESTORE_AD VTECH_SHUTTLE'.replace(' ', '')) {
        return res.status(400).json({ error: 'Confirmation required' });
      }

      const client = await pool.connect();

      try {
        await client.query('BEGIN');

        // Prevent concurrent restoration requests.
        await client.query(
          "SELECT pg_advisory_xact_lock(hashtext('advttech-shuttle-restoration'))"
        );

        // Verify the existing driver before inserting anything.
        const driver = await client.query(
          `SELECT id FROM users
           WHERE id = $1 AND email = $2
             AND role = 'driver' AND is_active = TRUE`,
          [44, 'driver']
        );

        if (driver.rowCount !== 1) {
          throw new Error('Confirmed driver account was not found');
        }

        // Refuse another restoration after the shuttle is assigned.
        const completed = await client.query(
          `SELECT id FROM shuttles
           WHERE label = $1 AND driver_id = $2`,
          ['ADvTECH Shuttle 1', 44]
        );

        if (completed.rowCount > 0) {
          throw new Error('Restoration already completed or requires manual review');
        }
        const routeName =
          'Sandton Gautrain Station ↔ ADvTECH 1 Waterstone';

        const existingRoutes = await client.query(
          'SELECT id FROM routes WHERE name = $1',
          [routeName]
        );

        if (existingRoutes.rowCount > 1) {
          throw new Error('Duplicate routes require manual review');
        }

        let routeId;

        if (existingRoutes.rowCount === 1) {
          routeId = existingRoutes.rows[0].id;
        } else {
          const inserted = await client.query(
            'INSERT INTO routes(name, active) VALUES($1, TRUE) RETURNING id',
            [routeName]
          );
          routeId = inserted.rows[0].id;
        }

        const stops = [
          ['Sandton Gautrain Station', -26.1076, 28.0567, 1],
          ['ADvTECH 1 Waterstone', -26.094, 28.071, 2]
        ];

        for (const [name, lat, lng, order] of stops) {
          const existing = await client.query(
            'SELECT id FROM stops WHERE route_id = $1 AND name = $2',
            [routeId, name]
          );

          if (existing.rowCount > 1) {
            throw new Error('Duplicate stops require manual review');
          }

          if (existing.rowCount === 0) {
            await client.query(
              `INSERT INTO stops(route_id, name, lat, lng, stop_order)
               VALUES($1, $2, $3, $4, $5)`,
              [routeId, name, lat, lng, order]
            );
          }
        }

        const existingShuttles = await client.query(
          'SELECT id, route_id, driver_id FROM shuttles WHERE label = $1',
          ['ADvTECH Shuttle 1']
        );

        if (existingShuttles.rowCount > 1) {
          throw new Error('Duplicate shuttles require manual review');
        }

        if (existingShuttles.rowCount === 0) {
          await client.query(
            `INSERT INTO shuttles(label, route_id, driver_id, status)
             VALUES($1, $2, $3, $4)`,
            ['ADvTECH Shuttle 1', routeId, 44, 'At Stop']
          );
        } else {
          const shuttle = existingShuttles.rows[0];
          if (shuttle.route_id !== routeId || shuttle.driver_id !== 44) {
            throw new Error('Existing shuttle assignment requires manual review');
          }
        }

        await client.query('COMMIT');

        res.json({
          success: true,
          routeId,
          driverId: 44,
          message: 'Shuttle route and stops verified or restored'
        });
      } catch (error) {
        await client.query('ROLLBACK');
        console.error('Shuttle restoration failed:', error.message);
        res.status(409).json({ error: error.message });
      } finally {
        client.release();
      }
    })
  );
}
