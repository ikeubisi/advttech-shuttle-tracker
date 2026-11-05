import { registerAuthRoutes } from './routes/auth.js';
import { registerOverviewRoutes } from './routes/overview.js';
import { registerDriverRoutes } from './routes/driver.js';
import { registerAdminRoutes } from './routes/admin.js';
import { getBoardingOverview } from './boarding-overview.js';
import { boardingRouter } from './boarding-routes.js';
import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import bcrypt from 'bcryptjs';
import crypto from 'node:crypto';
import { pool } from './db.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const app = express();
app.use(helmet({ contentSecurityPolicy: false }));
app.use(express.json({ limit: '20kb' }));
app.use(cookieParser());
const hash = (s) => crypto.createHash('sha256').update(s).digest('hex');
const wrap = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const auth = wrap(async (req, res, next) => {
  const token = req.cookies.shuttle_session;
  if (!token) return res.status(401).json({ error: 'Please sign in' });
  const q = await pool.query(
    'SELECT u.id,u.email AS username,u.name AS "displayName",u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.is_active=TRUE',
    [hash(token)],
  );
  if (!q.rowCount) return res.status(401).json({ error: 'Session expired' });
  req.user = q.rows[0];
  next();
});
const role =
  (...roles) =>
  (req, res, next) =>
    roles.includes(req.user.role) ? next() : res.status(403).json({ error: 'Access denied' });
registerAuthRoutes(app, { auth, wrap, pool, hash, rateLimit, bcrypt, crypto });
registerOverviewRoutes(app, { auth, wrap, pool, getBoardingOverview });
registerDriverRoutes(app, { auth, role, wrap, pool });
registerAdminRoutes(app, { auth, role, wrap, pool, bcrypt, boardingRouter });
const clientDist = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../client/dist');

app.use(express.static(clientDist));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api/')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Server error' });
});
const port = Number(process.env.PORT || 4000);
app.listen(port, '0.0.0.0', () => console.log(`ADvTECH API running on port ${port}`));
