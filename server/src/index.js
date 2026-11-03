import { getBoardingOverview } from './boarding-overview.js';
import { boardingRouter } from './boarding-routes.js';
import 'dotenv/config';import express from 'express';import helmet from 'helmet';import cookieParser from 'cookie-parser';import rateLimit from 'express-rate-limit';import bcrypt from 'bcryptjs';import crypto from 'node:crypto';import {pool} from './db.js';import path from 'node:path';import {fileURLToPath} from 'node:url';
const app=express();app.use(helmet({contentSecurityPolicy:false}));app.use(express.json({limit:'20kb'}));app.use(cookieParser());const hash=s=>crypto.createHash('sha256').update(s).digest('hex');const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);const auth=wrap(async(req,res,next)=>{const token=req.cookies.shuttle_session;if(!token)return res.status(401).json({error:'Please sign in'});const q=await pool.query('SELECT u.id,u.email AS username,u.name AS "displayName",u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.is_active=TRUE',[hash(token)]);if(!q.rowCount)return res.status(401).json({error:'Session expired'});req.user=q.rows[0];next()});const role=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({error:'Access denied'});
app.post('/api/auth/login',rateLimit({windowMs:15*60*1000,limit:20,standardHeaders:'draft-7',legacyHeaders:false}),wrap(async(req,res)=>{const username=String(req.body.username||'').toLowerCase().trim(),password=String(req.body.password||'');const q=await pool.query('SELECT * FROM users WHERE LOWER(email)=$1 AND is_active=TRUE',[username]);if(!q.rowCount||!await bcrypt.compare(password,q.rows[0].password_hash))return res.status(401).json({error:'Invalid username or password'});const token=crypto.randomBytes(32).toString('hex');await pool.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '7 days')",[hash(token),q.rows[0].id]);res.cookie('shuttle_session',token,{httpOnly:true,sameSite:'lax',secure:process.env.NODE_ENV==='production',maxAge:604800000});res.json({user:{id:q.rows[0].id,username:q.rows[0].email,displayName:q.rows[0].name,role:q.rows[0].role}})}));
app.get('/api/auth/me',auth,(req,res)=>res.json({user:req.user}));app.post('/api/auth/logout',auth,wrap(async(req,res)=>{await pool.query('DELETE FROM sessions WHERE token_hash=$1',[hash(req.cookies.shuttle_session)]);res.clearCookie('shuttle_session');res.json({ok:true})}));
app.get('/api/overview',auth,wrap(async(req,res)=>{const [route,stops,departures,status,location]=await Promise.all([pool.query('SELECT * FROM routes ORDER BY id LIMIT 1'),pool.query('SELECT * FROM stops ORDER BY stop_order'),pool.query('SELECT * FROM departures ORDER BY departure_time'),pool.query('SELECT status FROM shuttle_state WHERE id=1'),pool.query('SELECT lat,lng,accuracy,created_at AS "updatedAt" FROM locations ORDER BY created_at DESC LIMIT 1')]);const gps=location.rows[0]||null;res.json({route:route.rows[0]||null,stops:stops.rows,departures:departures.rows,status:status.rows[0]?.status||'At Stop',location:gps&&Date.now()-new Date(gps.updatedAt).getTime()<90000?gps:null,lastGps:gps,...(await getBoardingOverview(req.user))})}));
app.post('/api/driver/location',auth,role('driver','admin'),wrap(async(req,res)=>{const {lat,lng,accuracy}=req.body;if(!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>90||Math.abs(lng)>180)return res.status(400).json({error:'Invalid GPS coordinates'});await pool.query('INSERT INTO locations(user_id,lat,lng,accuracy) VALUES($1,$2,$3,$4)',[req.user.id,lat,lng,Number.isFinite(accuracy)?accuracy:null]);res.json({ok:true})}));
app.post('/api/driver/status',auth,role('driver','admin'),wrap(async(req,res)=>{const allowed=['On Route','At Stop','Delayed','Out of Service'];if(!allowed.includes(req.body.status))return res.status(400).json({error:'Invalid status'});await pool.query('UPDATE shuttle_state SET status=$1 WHERE id=1',[req.body.status]);res.json({ok:true})}));
app.get('/api/admin/users',auth,role('admin'),wrap(async(req,res)=>{const q=await pool.query('SELECT id,email AS username,name AS "displayName",role,is_active AS "isActive" FROM users ORDER BY id');res.json(q.rows)}));app.post('/api/admin/users',auth,role('admin'),wrap(async(req,res)=>{const {username,displayName,password,role:accountRole}=req.body;if(!/^[a-z0-9._-]{3,80}$/i.test(username||'')||!displayName||String(password||'').length<12||!['admin','driver','passenger'].includes(accountRole))return res.status(400).json({error:'Check name, username, role and password (12+ characters)'});const h=await bcrypt.hash(password,12);try{const q=await pool.query('INSERT INTO users(email,name,password_hash,role) VALUES($1,$2,$3,$4) RETURNING id,email AS username,name AS "displayName",role',[username.toLowerCase(),displayName,h,accountRole]);res.status(201).json(q.rows[0])}catch(e){if(e.code==='23505')return res.status(409).json({error:'Username already exists'});throw e}}));
app.patch('/api/admin/users/:id/active',auth,role('admin'),wrap(async(req,res)=>{
  const id=Number(req.params.id);
  const active=req.body.isActive;

  if(!Number.isSafeInteger(id)||id<=0||typeof active!=='boolean')
    return res.status(400).json({error:'Invalid request'});

  if(id===Number(req.user.id)&&active===false)
    return res.status(400).json({error:'You cannot remove your own account'});

  const client=await pool.connect();

  try{
    await client.query('BEGIN');

    const result=await client.query(
      'UPDATE users SET is_active=$1 WHERE id=$2 RETURNING id,email AS username,name AS "displayName",role,is_active AS "isActive"',
      [active,id]
    );

    if(!result.rowCount){
      await client.query('ROLLBACK');
      return res.status(404).json({error:'User not found'});
    }

    if(!active)
      await client.query('DELETE FROM sessions WHERE user_id=$1',[id]);

    await client.query('COMMIT');
    res.json({user:result.rows[0]});
  }catch(e){
    await client.query('ROLLBACK');
    throw e;
  }finally{
    client.release();
  }
}));
app.use('/api/passenger',auth,boardingRouter);
app.get('/api/admin/history',auth,role('admin'),wrap(async(req,res)=>{const q=await pool.query('SELECT l.id,l.lat,l.lng,l.accuracy,l.created_at AS "createdAt",u.name AS driver FROM locations l LEFT JOIN users u ON u.id=l.user_id ORDER BY l.created_at DESC LIMIT 100');res.json(q.rows)}));
app.use((err,req,res,next)=>{console.error(err);res.status(500).json({error:'Server error'})});const port=Number(process.env.PORT||4000);app.listen(port,'0.0.0.0',()=>console.log(`ADvTECH API running on port ${port}`));
