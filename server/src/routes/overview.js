export function registerOverviewRoutes(
  app,
  { auth, wrap, pool, getBoardingOverview },
) {
  app.get(
    "/api/overview",
    auth,
    wrap(async (req, res) => {
      const [route, stops, departures, status, location] = await Promise.all([
        pool.query("SELECT * FROM routes ORDER BY id LIMIT 1"),
        pool.query("SELECT * FROM stops ORDER BY stop_order"),
        pool.query("SELECT * FROM departures ORDER BY departure_time"),
        pool.query("SELECT status FROM shuttle_state WHERE id=1"),
        pool.query(
          `SELECT l.lat, l.lng, l.accuracy, l.created_at AS "updatedAt"
FROM locations l
JOIN shuttles s ON s.driver_id = l.user_id
WHERE s.id = (
  SELECT id FROM shuttles ORDER BY id LIMIT 1
)
ORDER BY l.created_at DESC, l.id DESC
LIMIT 1`,
        ),
      ]);
      const gps = location.rows[0] || null;
      res.json({
        route: route.rows[0] || null,
        stops: stops.rows,
        departures: departures.rows,
        status: status.rows[0]?.status || "At Stop",
        location:
          gps && Date.now() - new Date(gps.updatedAt).getTime() < 90000
            ? gps
            : null,
        lastGps: gps,
        ...(await getBoardingOverview(req.user)),
      });
    }),
  );
}
