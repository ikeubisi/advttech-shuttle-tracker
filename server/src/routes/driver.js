import { processDriverDepartures } from "../services/driver-departure.js";
import { getDepartureState } from "../services/departure-state.js";
import { processDriverArrivals } from "../services/driver-arrival.js";
export function registerDriverRoutes(app, { auth, role, wrap, pool }) {
  app.post(
    "/api/driver/location",
    auth,
    role("driver", "admin"),
    wrap(async (req, res) => {
      const { lat, lng, accuracy } = req.body;
      if (
        !Number.isFinite(lat) ||
        !Number.isFinite(lng) ||
        Math.abs(lat) > 90 ||
        Math.abs(lng) > 180
      )
        return res.status(400).json({ error: "Invalid GPS coordinates" });
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        await client.query(
          "INSERT INTO locations(user_id,lat,lng,accuracy) VALUES($1,$2,$3,$4)",
          [req.user.id, lat, lng, Number.isFinite(accuracy) ? accuracy : null],
        );

        const departures = await processDriverDepartures(client, req.user.id);
        const arrivals = await processDriverArrivals(client, req.user.id);

        await client.query("COMMIT");

        res.json({ ok: true, departures, arrivals });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
  );
  app.get(
    "/api/driver/departure-state",
    auth,
    role("driver"),
    wrap(async (req, res) => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const shuttleResult = await client.query(
          `SELECT id
         FROM shuttles
         WHERE driver_id=$1
         FOR UPDATE`,
          [req.user.id],
        );

        if (shuttleResult.rowCount !== 1) {
          await client.query("ROLLBACK");

          return res.status(409).json({
            error:
              shuttleResult.rowCount === 0
                ? "No shuttle assigned to this driver"
                : "Multiple shuttle assignments require review",
          });
        }

        const state = await getDepartureState(client, shuttleResult.rows[0].id);

        await client.query("COMMIT");

        return res.json({
          ok: true,
          departure: state,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
  );
  app.post(
    "/api/driver/confirm-departure",
    auth,
    role("driver"),
    wrap(async (req, res) => {
      const client = await pool.connect();

      try {
        await client.query("BEGIN");

        const shuttleResult = await client.query(
          `SELECT id
         FROM shuttles
         WHERE driver_id=$1
         FOR UPDATE`,
          [req.user.id],
        );

        if (!shuttleResult.rowCount) {
          await client.query("ROLLBACK");
          return res.status(404).json({
            error: "No shuttle assigned to this driver",
          });
        }

        if (shuttleResult.rowCount !== 1) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "Multiple shuttle assignments require review",
          });
        }

        const shuttleId = shuttleResult.rows[0].id;
        const state = await getDepartureState(client, shuttleId);

        if (!state) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "No active stop visit",
          });
        }

        if (state.departedAt) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "Departure already recorded",
          });
        }

        if (state.driverConfirmedAt) {
          await client.query("COMMIT");
          return res.json({
            ok: true,
            message: "Departure already confirmed",
            departure: state,
          });
        }

        if (!state.ready) {
          await client.query("ROLLBACK");
          return res.status(409).json({
            error: "Departure is not ready",
            remainingSeconds: state.remainingSeconds,
            passengerCount: state.passengerCount,
          });
        }

        const confirmed = await client.query(
          `UPDATE shuttle_stop_visits
         SET driver_confirmed_at=now()
         WHERE id=$1
           AND driver_confirmed_at IS NULL
           AND departed_at IS NULL
           AND completed_at IS NULL
         RETURNING driver_confirmed_at`,
          [state.visitId],
        );

        if (!confirmed.rowCount) {
          throw new Error("Departure confirmation could not be recorded");
        }

        await client.query("COMMIT");

        return res.json({
          ok: true,
          message: "Driver confirmed departure. Awaiting GPS verification.",
          visitId: state.visitId,
          driverConfirmedAt: confirmed.rows[0].driver_confirmed_at,
        });
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    }),
  );
  app.post(
    "/api/driver/status",
    auth,
    role("driver", "admin"),
    wrap(async (req, res) => {
      const allowed = ["On Route", "At Stop", "Delayed", "Out of Service"];
      if (!allowed.includes(req.body.status))
        return res.status(400).json({ error: "Invalid status" });
      await pool.query("UPDATE shuttle_state SET status=$1 WHERE id=1", [
        req.body.status,
      ]);
      res.json({ ok: true });
    }),
  );
}
