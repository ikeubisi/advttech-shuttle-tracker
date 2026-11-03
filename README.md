# ADvTECH Shuttle Tracker — Reconstructed Project

This is a **new reconstruction**, based on the supplied screenshots and the exact uploaded ADvTECH building photo (`client/public/building.jpeg`). It is not a recovered byte-for-byte copy of the deleted ZIP.

## Included
- React/Vite frontend with login, passenger, driver and administrator dashboards.
- Exact user-provided building photograph as login background.
- Leaflet/OpenStreetMap map, route stops and scheduled departures.
- PostgreSQL database, session-based login, role-based access and administrator account creation.
- Driver GPS sharing (real device GPS only) and recorded GPS history. No fake live GPS.

## Setup in VS Code (Windows PowerShell)

1. Install Node.js 22+ and PostgreSQL.
2. **If you already have a PostgreSQL database with accounts, back it up first and reuse that database.** Only create `advttech_shuttle` if you are starting fresh. Existing credentials will work only if the account schema and password hashes are compatible with this application.
3. Open the extracted folder in VS Code.
4. Run:

```powershell
npm install
npm --prefix client install
npm --prefix server install
Copy-Item server/.env.example server/.env
```

5. Edit `server/.env`: set `DATABASE_URL` to the database you intend to use. **Do not commit your `.env` file or share its password.** If existing accounts are present, do not reset them or run the seed command. Confirm schema compatibility before running migrations against an existing database.
6. Run:

```powershell
npm --prefix server run migrate
# Only for a new database with no admin account:
# npm --prefix server run seed
npm run dev
```

7. Open http://localhost:5173 and sign in with your existing compatible account, or the seeded admin account if you started a new database.
8. From Admin → Users, create driver and passenger accounts only if they do not already exist.

## GPS notes
- Driver location comes from `navigator.geolocation.watchPosition`; drivers must consent to browser GPS permissions.
- Mobile browsers normally require HTTPS (except localhost). A plain HTTP LAN address may not allow GPS.
- Keep the driver's browser open; mobile background restrictions can interrupt updates.
- The passenger map only shows a GPS position as current if it is under 90 seconds old.
- OpenStreetMap tiles require internet unless you provide an approved offline map tile service.
- Route coordinates and timetable are illustrative placeholders and should be verified before actual operations.
- This is a development starter, not a production fleet tracking system. Deploy with HTTPS, privacy controls, approved tracking policies and security review.

## Notes
- "Forgot password" is informational only; an administrator must manage password resets outside the app until a verified recovery flow is implemented.
- The supplied background image is preserved unmodified.

## Existing accounts / important compatibility note
This reconstruction does **not** contain a copy of your existing PostgreSQL database, usernames or password hashes. It expects a `users` table with `username`, `display_name`, `password_hash` (bcrypt), and `role` (`admin`, `driver`, `passenger`). A prior project may have a different table schema or password format. **Back up your existing database before running `migrate`.** Do not delete tables or recreate users. If your database differs, adapt the API or migrate the schema carefully while preserving the original password hashes.
