import React,{useEffect,useState,useRef} from 'react';import{createRoot}from'react-dom/client';import{MapContainer,TileLayer,Marker,Polyline,Popup,useMap}from'react-leaflet';import L from 'leaflet';import{Menu,BusFront,MapPin,Clock3,CalendarDays,History,Users,Settings,LogOut,Eye,EyeOff,Wifi,Navigation,CheckCircle2,AlertTriangle,Lock,Mail,UserCircle,Info,RefreshCw}from'lucide-react';import 'leaflet/dist/leaflet.css';import './style.css';
const logo='ADvTECH';const marker=new L.Icon({iconUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',shadowUrl:'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',iconSize:[25,41],iconAnchor:[12,41]});const initial=[[-26.1076,28.0567],[-26.094,28.071]];async function api(url,options={}){const r=await fetch('/api'+url,{credentials:'same-origin',headers:{'Content-Type':'application/json'},...options});const data=await r.json().catch(()=>({}));if(!r.ok)throw Error(data.error||'Request failed');return data}function Brand(){return <div className="brand"><strong>AD<span>v</span>TECH</strong><b>SHUTTLE TRACKER</b></div>}
function Login({onLogin}){const[username,setUsername]=useState(''),[password,setPassword]=useState(''),[show,setShow]=useState(false),[remember,setRemember]=useState(true),[error,setError]=useState(''),[busy,setBusy]=useState(false);async function submit(e){e.preventDefault();setBusy(true);setError('');try{const x=await api('/auth/login',{method:'POST',body:JSON.stringify({username,password})});onLogin(x.user)}catch(e){setError(e.message)}finally{setBusy(false)}}return <div className="login-page"><div className="login-overlay"><Brand/><form className="login-card" onSubmit={submit}><h2>Sign In to Your Account</h2><label className="field"><Mail size={20}/><input required value={username} onChange={e=>setUsername(e.target.value)} placeholder="Email or Username" autoComplete="username"/></label><label className="field"><Lock size={20}/><input required type={show?'text':'password'} value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" autoComplete="current-password"/><button type="button" className="eye" onClick={()=>setShow(!show)}>{show?<EyeOff size={19}/>:<Eye size={19}/>}</button></label><div className="login-options"><label><input type="checkbox" checked={remember} onChange={e=>setRemember(e.target.checked)}/> Remember me</label><span title="Contact your shuttle administrator to reset your password">Forgot password?</span></div>{error&&<p className="error">{error}</p>}<button className="primary" disabled={busy}>{busy?'Signing in...':'Sign In'}</button><p className="signup">Don't have an account? <span>Contact administrator</span></p></form></div></div>}
const shuttleIcon=L.divIcon({className:'shuttle-gps-marker',html:'<span aria-label="Shuttle">&#128652;</span>',iconSize:[42,42],iconAnchor:[21,21]});
function FollowShuttle({gps}){const map=useMap();useEffect(()=>{if(gps)map.flyTo([Number(gps.lat),Number(gps.lng)],Math.max(map.getZoom(),14),{animate:true,duration:1.2})},[gps?.lat,gps?.lng]);return null}
function ShuttleMap({data}){const stops=(data?.stops||[]).filter(s=>s.lat!=null&&s.lng!=null&&Number.isFinite(Number(s.lat))&&Number.isFinite(Number(s.lng)));const gps=data?.location;const center=gps?[Number(gps.lat),Number(gps.lng)]:stops.length?[Number(stops[0].lat),Number(stops[0].lng)]:initial[0];const trail=(data?.trail||[]).map(p=>[Number(p.lat),Number(p.lng)]).reverse();return <div className="map"><MapContainer center={center} zoom={14} scrollWheelZoom={true} dragging={true} touchZoom={true} doubleClickZoom={true} zoomControl={true} style={{height:'100%',width:'100%'}}><TileLayer attribution='© OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"/>{trail.length>1&&<Polyline positions={trail} pathOptions={{color:'#12a66a',weight:6,opacity:.8}}/>}{stops.filter(s=>!/advtech|waterstone/i.test(s.name||'')).map(s=><Marker key={s.id} position={[Number(s.lat),Number(s.lng)]} icon={marker}><Popup>{s.name}</Popup></Marker>)}{gps&&<Marker position={[Number(gps.lat),Number(gps.lng)]} icon={shuttleIcon}><Popup>{gps?"Live shuttle":"Awaiting GPS - placeholder only"} - {data?.eta?.minutes!=null?'ETA '+data.eta.minutes+' min':'ETA calculating'}</Popup></Marker>}<FollowShuttle gps={gps}/></MapContainer></div>}
function ArrivalPanel({data}){const eta=data?.eta;return <div className="arrival-panel"><strong>{data?.location?'Live shuttle':'GPS offline / waiting'}</strong><span>{eta?.stopName?'Next stop: '+eta.stopName:'Next stop unavailable'}</span><b>{eta?.minutes!=null?'Estimated arrival: '+eta.minutes+' min':'ETA unavailable'}</b><small>{eta?.note||'Updates when fresh driver GPS is available; estimate excludes traffic.'}</small></div>}
function BoardingPanel({data,reload}){const [origin,setOrigin]=useState(''),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);const stops=data?.stops||[];useEffect(()=>{if(!origin&&stops.length)setOrigin(String(stops[0].id))},[stops.length]);async function send(kind){if(!navigator.geolocation){setMessage('GPS is not supported');return}setBusy(true);setMessage('Checking phone GPS...');navigator.geolocation.getCurrentPosition(async p=>{try{const body={lat:p.coords.latitude,lng:p.coords.longitude,accuracy:p.coords.accuracy,timestamp:p.timestamp,...(kind==='board'?{stopId:Number(origin)}:{})};const result=await api('/passenger/'+kind,{method:'POST',body:JSON.stringify(body)});setMessage(result.message||'Confirmed');reload()}catch(e){setMessage(e.message)}finally{setBusy(false)}},e=>{setMessage(e.message);setBusy(false)},{enableHighAccuracy:true,maximumAge:0,timeout:20000})}return <section className="panel boarding-panel"><h3>My shuttle journey</h3><p>Check in only after physically boarding. Your phone and the shuttle must be at the same stop.</p><label>Boarding stop <select value={origin} onChange={e=>setOrigin(e.target.value)}>{stops.map(s=><option value={s.id} key={s.id}>{s.name}</option>)}</select></label><div className="boarding-actions"><button disabled={busy||!origin||!!data?.myBoarding} onClick={()=>send('board')}>Confirm boarding</button><button disabled={busy||!data?.myBoarding} onClick={()=>send('exit')}>Confirm exit</button></div><p>{data?.myBoarding?'You are checked in. Confirm exit at the destination.':'You are not currently checked in.'}</p>{message&&<p role="status">{message}</p>}</section>}
function Topbar({user,onLogout}){return <header className="topbar"><Menu size={22}/><div className="top-brand">AD<span>v</span>TECH <small>│ SHUTTLE TRACKER</small></div><div className="profile"><UserCircle size={25}/> {user.role==='admin'?'Shuttle Administrator':user.role==='driver'?'Driver':'Passenger'} <button onClick={onLogout} title="Sign out"><LogOut size={17}/></button></div></header>}
function RouteBox({data}){return <div className="route-box"><BusFront size={30}/><div><strong>Active Route</strong><b>{data?.route?.start_name||'Sandton Gautrain Station'} ↔<br/>{data?.route?.end_name||'ADvTECH 1 Waterstone'}</b></div></div>}
function Passenger({data,reload}){return <main className="passenger content"><h1>Your Daily Journey</h1><p>Live shuttle information, route stops and upcoming departures.</p><div className="status-card"><span className="green-dot"/><div><b>Shuttle Status</b><h2>{data?.status||'At Stop'}</h2><small>{data?.location?'Live driver GPS received':'Awaiting current driver GPS'}</small></div><BusFront className="status-bus" size={36}/></div><div className="route-line"><BusFront size={26}/><b>{data?.route?.start_name||'Sandton Gautrain Station'} ↔<br/>{data?.route?.end_name||'ADvTECH 1 Waterstone'}</b></div><ShuttleMap data={data}/><ArrivalPanel data={data}/><ArrivalPanel data={data}/><BoardingPanel data={data} reload={reload}/><section className="panel departures"><h3><CalendarDays size={22}/> Upcoming Departures</h3>{(data?.departures||[]).map(d=><div className="departure" key={d.id}><b>{d.departure_time}</b><span>{d.destination}</span><em>{d.status}</em></div>)}</section><div className="train-note">Train &nbsp; Gautrain: Which train should I catch?</div></main>}
function Driver({data,reload}){
  const [sharing,setSharing]=useState(false);
  const [gpsStatus,setGpsStatus]=useState('off');
  const [error,setError]=useState('');
  const [lastSent,setLastSent]=useState(null);
  const watch=useRef(null);
  const active=useRef(false);

  function stopSharing(){
    active.current=false;
    if(watch.current!==null){
      navigator.geolocation?.clearWatch(watch.current);
      watch.current=null;
    }
    setSharing(false);
    setGpsStatus('off');
  }

  useEffect(()=>()=>{active.current=false;if(watch.current!==null)navigator.geolocation?.clearWatch(watch.current)},[]);

  function toggle(){
    if(sharing){
      stopSharing();
      return;
    }

    if(!navigator.geolocation){
      setError('Geolocation is not supported on this device.');
      setGpsStatus('error');
      return;
    }

    setError('');
    setLastSent(null);
    setGpsStatus('waiting');
    setSharing(true);
    active.current=true;

    watch.current=navigator.geolocation.watchPosition(
      async p=>{
        if(!active.current)return;
        try{
          await api('/driver/location',{
            method:'POST',
            body:JSON.stringify({
              lat:p.coords.latitude,
              lng:p.coords.longitude,
              accuracy:p.coords.accuracy
            })
          });

          if(!active.current)return;
          setLastSent(new Date().toLocaleTimeString());
          setGpsStatus('active');
          setError('');
          reload();
        }catch(e){
          if(!active.current)return;
          setGpsStatus('error');
          setError('GPS upload failed: '+e.message);
        }
      },
      e=>{
        if(!active.current)return;
        setGpsStatus('error');
        setError('Android GPS error: '+e.message);
      },
      {
        enableHighAccuracy:true,
        maximumAge:0,
        timeout:20000
      }
    );
  }

  async function status(s){
    try{
      await api('/driver/status',{
        method:'POST',
        body:JSON.stringify({status:s})
      });
      reload();
    }catch(e){
      setError(e.message);
    }
  }

  return <main className="driver content">
    <h1>Driver GPS Sharing</h1>
    <p>Share this device's actual GPS position with signed-in passengers.</p>

    <h3>Shuttle Status</h3>
    <div className="status-buttons">
      {[
        ['On Route','OK'],
        ['At Stop','◷'],
        ['Delayed','!'],
        ['Out of Service','×']
      ].map(([s,icon])=>
        <button
          className={(data?.status===s?'selected ':'')+s.toLowerCase().replaceAll(' ','-')}
          key={s}
          onClick={()=>status(s)}
        >
          <strong>{icon}</strong>{s}
        </button>
      )}
    </div>

    <button className="share" onClick={toggle}>
      <MapPin size={22}/>
      {sharing?'Stop Sharing Location':'Start Sharing Location'}
    </button>

    <div className={'gps-message '+(gpsStatus==='active'?'active':'')}>
      <CheckCircle2 size={24}/>
      <div>
        <b>
          {gpsStatus==='off'?'GPS Sharing OFF':
           gpsStatus==='waiting'?'Waiting for Android GPS':
           gpsStatus==='active'?'GPS Upload Successful':
           'GPS Sharing Error'}
        </b>
        <small>
          {lastSent?'Last successful upload: '+lastSent:
           'Waiting for a confirmed location upload'}
        </small>
      </div>
    </div>

    {error&&<p className="error">{error}</p>}

    <RouteBox data={data}/>

<section className="panel driver-map-panel">
  <h3>Live Shuttle Location</h3>
  <p>View your current GPS position on the map.</p>
  <ShuttleMap data={data}/>
</section>

    <p className="safety">
      <Info size={20}/>
      Keep this page open while driving. Use a mounted device and do not operate it while the vehicle is moving.
    </p>

    <div className="location-box">
      <MapPin size={30}/>
      <div>
        <b>Current Location</b>
        <small>
          {data?.location
            ? `Lat: ${Number(data.location.lat).toFixed(5)}, Lng: ${Number(data.location.lng).toFixed(5)}`
            : 'Waiting for GPS signal'}
        </small>
      </div>
    </div>
  </main>;
}
function Admin({data,reload,currentUser}){const[page,setPage]=useState('Dashboard'),[users,setUsers]=useState([]),[history,setHistory]=useState([]),[form,setForm]=useState({username:'',displayName:'',password:'',role:'passenger'}),[message,setMessage]=useState('');useEffect(()=>{if(page==='Users')api('/admin/users').then(setUsers).catch(e=>setMessage(e.message));if(page==='Trip History')api('/admin/history').then(setHistory).catch(e=>setMessage(e.message))},[page]);async function changeUserStatus(u){
  const active=!u.isActive;

  if(!window.confirm(
    active
      ? `Reactivate ${u.displayName}?`
      : `Remove ${u.displayName}? This will disable their account and sign them out.`
  ))return;

  try{
    await api(`/admin/users/${u.id}/active`,{
      method:'PATCH',
      body:JSON.stringify({isActive:active})
    });

    setUsers(await api('/admin/users'));
    setMessage(active?'User reactivated':'User removed');
  }catch(e){
    setMessage(e.message);
  }
}
async function addUser(e){e.preventDefault();try{await api('/admin/users',{method:'POST',body:JSON.stringify(form)});setMessage('User created');setUsers(await api('/admin/users'));setForm({username:'',displayName:'',password:'',role:'passenger'})}catch(e){setMessage(e.message)}}return <div className="admin-layout"><aside className="sidebar">{[['Dashboard',BusFront],['Routes',Navigation],['Departures',CalendarDays],['Trip History',History],['Users',Users],['Settings',Settings]].map(([name,Icon])=><button key={name} className={page===name?'current':''} onClick={()=>{setPage(name);setMessage('')}}><Icon size={20}/>{name}</button>)}</aside><main className="admin-content">{message&&<p className="notice">{message}</p>}{page==='Dashboard'?<><div className="admin-heading"><div><h1>Welcome, Shuttle Administrator</h1><p>Live information from the shuttle system.</p></div><div className="stats"><div><BusFront/><small>Shuttle Status</small><b>{data?.status||'At Stop'}</b></div><div><Clock3/><small>Last GPS Update</small><b>{data?.lastGps?new Date(data.lastGps.updatedAt).toLocaleTimeString():'Awaiting GPS'}</b></div><div><MapPin/><small>Route Stops</small><b>{data?.stops?.length||0} stops</b></div><div><Wifi/><small>Connection</small><b>Connected</b></div></div></div><div className="admin-grid"><section className="panel map-panel"><h3>Shuttle Location</h3><ShuttleMap data={data}/></section><section className="panel"><h3>Route Stops</h3><div className="arrival-panel"><b>Confirmed boardings today: {data?.counts?.boardedToday||0}</b><b>Currently onboard: {data?.counts?.onboard||0}</b><small>Check-in counts are GPS verified, not proof of physical boarding.</small></div>{(data?.stops||[]).map((s,i)=><div className="stop" key={s.id}><span>{i+1}</span><div><b>{s.name}</b><p>{i===0?'Starting point':'Destination'}</p></div></div>)}</section><div className="right-stack"><section className="panel"><h3><CalendarDays/> Shuttle Trip History</h3><p>Administrator view of recorded shuttle GPS movements.</p><button className="primary" onClick={()=>setPage('Trip History')}>View Trip History</button></section><section className="panel"><h3><Users/> Administrator Access</h3><div className="boarding-roster"><b>Currently onboard</b>{(data?.onboardUsers||[]).map(u=><p key={u.id}>{u.name} — {u.originName}</p>)}</div><p>Create passenger, driver and administrator accounts.</p><button className="primary" onClick={()=>setPage('Users')}>Manage Users</button></section></div></div></>:page==='Users'?<><h1>Users</h1><section className="panel"><h3>Create Account</h3><form className="user-form" onSubmit={addUser}><input required placeholder="Username" value={form.username} onChange={e=>setForm({...form,username:e.target.value})}/><input required placeholder="Display name" value={form.displayName} onChange={e=>setForm({...form,displayName:e.target.value})}/><input required minLength={12} type="password" placeholder="Password (12+ characters)" value={form.password} onChange={e=>setForm({...form,password:e.target.value})}/><select value={form.role} onChange={e=>setForm({...form,role:e.target.value})}><option value="passenger">Passenger</option><option value="driver">Driver</option><option value="admin">Administrator</option></select><button className="primary">Create User</button></form></section><section className="panel"><h3>Accounts</h3>{users.map(u=><div className="departure" key={u.id}><b>{u.username}</b><span>{u.displayName}</span><em>{u.role} · {u.isActive?'Active':'Removed'}</em>
{u.id!==currentUser?.id&&
<button
  type="button"
  onClick={()=>changeUserStatus(u)}
  style={{
    background:u.isActive?'#dc2626':'#15803d',
    color:'white',
    border:0,
    borderRadius:8,
    padding:'8px 12px',
    cursor:'pointer'
  }}
>
  {u.isActive?'Remove':'Reactivate'}
</button>}
</div>)}</section></>:page==='Trip History'?<><h1>Shuttle Trip History</h1><section className="panel">{history.length?history.map(h=><div className="departure" key={h.id}><b>{new Date(h.createdAt).toLocaleString()}</b><span>{h.driver}</span><span>{Number(h.lat).toFixed(5)}, {Number(h.lng).toFixed(5)}</span></div>):<p>No recorded GPS history yet.</p>}</section></>:page==='Routes'?<><h1>Routes</h1><RouteBox data={data}/><section className="panel"><h3>Stops</h3>{data?.stops?.map(s=><p key={s.id}>{s.stop_order}. {s.name}</p>)}</section></>:page==='Departures'?<><h1>Departures</h1><section className="panel departures">{data?.departures?.map(d=><div className="departure" key={d.id}><b>{d.departure_time}</b><span>{d.destination}</span><em>{d.status}</em></div>)}</section></>:<><h1>Settings</h1><section className="panel"><p>Account management and route data are stored in PostgreSQL. Contact your administrator for operational configuration.</p><button className="primary" onClick={reload}>Refresh Data</button></section></>}</main></div>}
function App(){const[user,setUser]=useState(undefined),[data,setData]=useState(null),[error,setError]=useState('');useEffect(()=>{api('/auth/me').then(x=>setUser(x.user)).catch(()=>setUser(null))},[]);async function reload(){try{setData(await api('/overview'));setError('')}catch(e){setError(e.message)}}useEffect(()=>{if(!user)return;reload();const id=setInterval(reload,5000);return()=>clearInterval(id)},[user]);async function logout(){try{await api('/auth/logout',{method:'POST'})}catch{}setUser(null)}if(user===undefined)return <div className="loading">Loading Shuttle Tracker...</div>;if(!user)return <Login onLogin={setUser}/>;return <div className="app"><Topbar user={user} onLogout={logout}/>{error&&<p className="notice">{error}</p>}{user.role==='admin'?<Admin data={data} reload={reload} currentUser={user}/>:user.role==='driver'?<Driver data={data} reload={reload}/>:<Passenger data={data} reload={reload}/>}</div>}createRoot(document.getElementById('root')).render(<App/>);
