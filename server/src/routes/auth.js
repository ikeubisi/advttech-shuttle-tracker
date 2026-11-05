export function registerAuthRoutes(app, { auth, wrap, pool, hash, rateLimit, bcrypt, crypto }) {
app.post(
  '/api/auth/login',
  rateLimit({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    standardHeaders: 'draft-7',
    legacyHeaders: false,
  }),
  wrap(async (req, res) => {
    const username = String(req.body.username || '')
        .toLowerCase()
        .trim(),
      password = String(req.body.password || '');
    const q = await pool.query('SELECT * FROM users WHERE LOWER(email)=$1 AND is_active=TRUE', [
      username,
    ]);
    if (!q.rowCount || !(await bcrypt.compare(password, q.rows[0].password_hash)))
      return res.status(401).json({ error: 'Invalid username or password' });
    const token = crypto.randomBytes(32).toString('hex');
    await pool.query(
      "INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",
      [hash(token), q.rows[0].id],
    );
    res.cookie('shuttle_session', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 604800000,
    });
    res.json({
      user: {
        id: q.rows[0].id,
        username: q.rows[0].email,
        displayName: q.rows[0].name,
        role: q.rows[0].role,
      },
    });
  }),
);
app.get('/api/auth/me', auth, (req, res) => res.json({ user: req.user }));
app.post(
  '/api/auth/logout',
  auth,
  wrap(async (req, res) => {
    await pool.query('DELETE FROM sessions WHERE token_hash=$1', [
      hash(req.cookies.shuttle_session),
    ]);
    res.clearCookie('shuttle_session');
    res.json({ ok: true });
  }),
);

}
