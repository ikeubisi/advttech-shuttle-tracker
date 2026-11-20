import React from "react";
import {
  BusFront,
  CalendarDays,
  MapPin,
  Navigation,
  Clock3,
  Wifi,
  ShieldCheck,
} from "lucide-react";

import ShuttleMap from "../../components/ShuttleMap.jsx";
import ArrivalPanel from "../../components/ArrivalPanel.jsx";
import BoardingPanel from "../../components/BoardingPanel.jsx";

export default function Passenger({ data, reload }) {
  const gpsAvailable = Boolean(data?.location);
  const departures = data?.departures || [];

  return (
    <main className="passenger content passenger-premium">
      <section className="passenger-hero">
        <div className="passenger-hero-shade" />

        <div className="passenger-hero-content">
          <div className="passenger-logo-wrap">
            <img
              src="/advtech-logo.png"
              alt="Original ADvTECH logo"
              className="passenger-logo"
            />
          </div>

          <span className="passenger-eyebrow">SHUTTLE TRACKER</span>

          <h1>
            Your journey,
            <br />
            made easier.
          </h1>

          <p>Welcome to your ADvTECH passenger journey.</p>
        </div>
      </section>

      <section className="passenger-section-heading">
        <div>
          <span className="passenger-kicker">YOUR DAILY JOURNEY</span>
          <h2>Live shuttle tracking</h2>
          <p>See your shuttle and follow your route.</p>
        </div>
        <div
          className={`gps-indicator ${gpsAvailable ? "gps-online" : "gps-offline"}`}
        >
          <span />
          {gpsAvailable ? "GPS LIVE" : "GPS WAITING"}
        </div>
      </section>

      <section className="quantum-status-card">
        <div className="quantum-status-top">
          <div>
            <span className="quantum-label">SHUTTLE STATUS</span>
            <h2>{data?.status || "Awaiting update"}</h2>
            <p>
              {gpsAvailable
                ? "Driver location received"
                : "Waiting for driver GPS"}
            </p>
          </div>

          <div className="quantum-vehicle-icon">
            <BusFront size={35} />
            <small>QUANTUM</small>
          </div>
        </div>

        <div className="quantum-status-footer">
          <Wifi size={16} />
          {gpsAvailable
            ? "Live location available"
            : "Location will appear when GPS is received"}
        </div>
      </section>

      <section className="passenger-route-card">
        <div className="passenger-card-heading">
          <div>
            <span className="passenger-kicker">YOUR ROUTE</span>
            <h3>Journey overview</h3>
          </div>
          <Navigation size={23} />
        </div>

        <div className="passenger-route-point">
          <span className="route-origin-dot" />
          <div>
            <small>FROM</small>
            <strong>
              {data?.route?.start_name || "Sandton Gautrain Station"}
            </strong>
          </div>
        </div>

        <div className="passenger-route-connector" />

        <div className="passenger-route-point">
          <span className="route-destination-dot" />
          <div>
            <small>TO</small>
            <strong>{data?.route?.end_name || "ADvTECH Waterstone"}</strong>
          </div>
        </div>
      </section>

      <section className="passenger-map-section">
        <div className="passenger-section-heading">
          <div>
            <span className="passenger-kicker">TRACK YOUR SHUTTLE</span>
            <h2>Live location</h2>
          </div>
          <MapPin size={23} />
        </div>

        <ShuttleMap data={data} />

        <div className="passenger-map-legend">
          <span>
            <i className="legend-shuttle" /> Shuttle
          </span>
          <span>
            <i className="legend-stop" /> Stops
          </span>
          <span>
            <i className="legend-route" /> Route history
          </span>
        </div>
      </section>

      <section className="passenger-arrival-section">
        <div className="passenger-section-heading">
          <div>
            <span className="passenger-kicker">JOURNEY INFORMATION</span>
            <h2>Arrival updates</h2>
          </div>
          <Clock3 size={23} />
        </div>

        <ArrivalPanel data={data} />
      </section>

      <section className="passenger-boarding-section">
        <div className="passenger-section-heading">
          <div>
            <span className="passenger-kicker">YOUR TRIP</span>
            <h2>Passenger boarding</h2>
          </div>
          <ShieldCheck size={23} />
        </div>

        <BoardingPanel data={data} reload={reload} />
      </section>

      <section className="panel departures passenger-departures">
        <div className="passenger-card-heading">
          <div>
            <span className="passenger-kicker">PLAN AHEAD</span>
            <h3>
              <CalendarDays size={21} /> Upcoming departures
            </h3>
          </div>
        </div>

        {departures.length > 0 ? (
          departures.map((d) => (
            <div className="departure" key={d.id}>
              <b>{d.departure_time}</b>
              <span>{d.destination}</span>
              <em>{d.status}</em>
            </div>
          ))
        ) : (
          <p className="passenger-empty">
            No upcoming departures are currently available.
          </p>
        )}
      </section>

      <footer className="passenger-footer">
        <span>ADvTECH SHUTTLE TRACKER</span>
        <p>Your journey matters.</p>
      </footer>
    </main>
  );
}
