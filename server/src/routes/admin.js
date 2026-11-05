export function registerAdminRoutes(app, { auth, role, wrap, pool, bcrypt, boardingRouter }) {
app.get(
  '/api/admin/users',
  auth,
  role('admin'),
  wrap(async (req, res) => {
    const q = await pool.query(
      'SELECT id,email AS username,name AS "displayName",role,is_active AS "isActive" FROM users ORDER BY id',
    );
    res.json(q.rows);
  }),
);
app.post(
  '/api/admin/users',
  auth,
  role('admin'),
  wrap(async (req, res) => {
    const { username, displayName, password, role: accountRole } = req.body;
    if (
      !/^[a-z0-9._-]{3,80}$/i.test(username || '') ||
      !displayName ||
      String(password || '').length < 7 ||
      !['admin', 'driver', 'passenger'].includes(accountRole)
    )
      return res
        .status(400)
        .json({ error: 'Check name, username, role and password (7+ characters)' });
    const h = await bcrypt.hash(password, 12);
    try {
      const q = await pool.query(
        'INSERT INTO users(email,name,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,email AS username,name AS "displayName",role',
        [username.toLowerCase(), displayName, h, accountRole],
      );
      res.status(201).json(q.rows[0]);
    } catch (e) {
      if (e.code === '23505') return res.status(409).json({ error: 'Username already exists' });
      throw e;
    }
  }),
);
app.patch(
  '/api/admin/users/:id/active',
  auth,
  role('admin'),
  wrap(async (req, res) => {
    const id = Number(req.params.id);
    const active = req.body.isActive;

    if (!Number.isSafeInteger(id) || id <= 0 || typeof active !== 'boolean')
      return res.status(400).json({ error: 'Invalid request' });

    if (id === Number(req.user.id) && active === false)
      return res.status(400).json({ error: 'You cannot remove your own account' });

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        'UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id,email AS username,name AS "displayName",role,is_active AS "isActive"',
        [active, id],
      );

      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      if (!active) await client.query('DELETE FROM sessions WHERE user_id=$1', [id]);

      await client.query('COMMIT');
      res.json({ user: result.rows[0] });
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }),
);
  app.delete('/api/admin/users/:id', auth, role('admin'), wrap(async (req, res) => {
    const id = Number(req.params.id);
    const confirmation = req.body?.confirmUsername;

    if (!Number.isSafeInteger(id) || id <= 0 ||
        typeof confirmation !== 'string') {
      return res.status(400).json({ error: 'Invalid deletion request' });
    }

    if (id === Number(req.user.id)) {
      return res.status(400).json({
        error: 'You cannot permanently delete your own account'
      });
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const result = await client.query(
        'SELECT id, email, role FROM users WHERE id = $1 FOR UPDATE',
        [id]
      );

      if (!result.rowCount) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'User not found' });
      }

      const user = result.rows[0];

      if (confirmation !== user.email) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Username confirmation does not match'
        });
      }

      const activeTrip = await client.query(
        'SELECT id FROM trips WHERE driver_id = $1 AND ended_at IS NULL LIMIT 1',
        [id]
      );

      if (activeTrip.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Cannot delete a driver while their trip is active'
        });
      }

      const activeShuttle = await client.query(
        `SELECT id FROM shuttles
         WHERE driver_id = $1 AND LOWER(status) = 'on route'
         LIMIT 1`,
        [id]
      );

      if (activeShuttle.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Cannot delete a driver operating a shuttle'
        });
      }

      const onboard = await client.query(
        `SELECT id FROM passenger_boardings
         WHERE user_id = $1 AND exited_at IS NULL LIMIT 1`,
        [id]
      );

      if (onboard.rowCount) {
        await client.query('ROLLBACK');
        return res.status(409).json({
          error: 'Cannot delete a passenger who is still onboard'
        });
      }

      await client.query('DELETE FROM sessions WHERE user_id = $1', [id]);
      await client.query('DELETE FROM locations WHERE user_id = $1', [id]);
      await client.query('DELETE FROM gps_history WHERE driver_id = $1', [id]);
      await client.query('DELETE FROM passenger_boardings WHERE user_id = $1', [id]);
      await client.query('DELETE FROM users WHERE id = $1', [id]);

      await client.query('COMMIT');

      res.json({ message: 'User permanently deleted' });
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }));

app.use('/api/passenger', auth, boardingRouter);
app.get(
  '/api/admin/boarding-history',
  auth,
  role('admin'),
  wrap(async (req, res) => {
    const q = await pool.query(`
    SELECT
      b.id,
      u.name AS "passengerName",
      o.name AS "boardingStop",
      d.name AS "destinationStop",
      b.boarded_at AS "boardedAt",
      b.exited_at AS "exitedAt",
      CASE
        WHEN b.exited_at IS NULL THEN 'Onboard'
        ELSE 'Exited'
      END AS status
    FROM passenger_boardings b
    JOIN users u ON u.id=b.user_id
    JOIN stops o ON o.id=b.origin_stop_id
    JOIN stops d ON d.id=b.destination_stop_id
    ORDER BY b.boarded_at DESC
    LIMIT 200
  `);
    res.json(q.rows);
  }),
);
app.get(
  '/api/admin/history',
  auth,
  role('admin'),
  wrap(async (req, res) => {
    const q = await pool.query(
      'SELECT l.id,l.lat,l.lng,l.accuracy,l.created_at AS "createdAt",u.name AS driver FROM locations l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT 100',
    );
    res.json(q.rows);
  }),
);

}
