export function registerDriverRoutes(app, { auth, role, wrap, pool }) {
app.post(
  '/api/driver/location',
  auth,
  role('driver', 'admin'),
  wrap(async (req, res) => {
    const { lat, lng, accuracy } = req.body;
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180)
      return res.status(400).json({ error: 'Invalid GPS coordinates' });
    await pool.query('INSERT INTO locations(user_id,lat,lng,accuracy) VALUES($1,$2,$3,$4)', [
      req.user.id,
      lat,
      lng,
      Number.isFinite(accuracy) ? accuracy : null,
    ]);
    res.json({ ok: true });
  }),
);
app.post(
  '/api/driver/status',
  auth,
  role('driver', 'admin'),
  wrap(async (req, res) => {
    const allowed = ['On Route', 'At Stop', 'Delayed', 'Out of Service'];
    if (!allowed.includes(req.body.status))
      return res.status(400).json({ error: 'Invalid status' });
    await pool.query('UPDATE shuttle_state SET status=$1 WHERE id=1', [req.body.status]);
    res.json({ ok: true });
  }),
);

}
