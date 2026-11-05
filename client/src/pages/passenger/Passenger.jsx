import ShuttleMap from '../../components/ShuttleMap.jsx';
import ArrivalPanel from '../../components/ArrivalPanel.jsx';
import BoardingPanel from '../../components/BoardingPanel.jsx';
import React from 'react';
import { BusFront, CalendarDays } from 'lucide-react';
export default function Passenger({ data, reload }) {
  return (
    <main className="passenger content">
      <h1>Your Daily Journey</h1>
      <p>Live shuttle information, route stops and upcoming departures.</p>
      <div className="status-card">
        <span className="green-dot" />
        <div>
          <b>Shuttle Status</b>
          <h2>{data?.status || 'At Stop'}</h2>
          <small>
            {data?.location ? 'Live driver GPS received' : 'Awaiting current driver GPS'}
          </small>
        </div>
        <BusFront className="status-bus" size={36} />
      </div>
      <div className="route-line">
        <BusFront size={26} />
        <b>
          {data?.route?.start_name || 'Sandton Gautrain Station'} â†”<br />
          {data?.route?.end_name || 'ADvTECH 1 Waterstone'}
        </b>
      </div>
      <ShuttleMap data={data} />
      <ArrivalPanel data={data} />
      <ArrivalPanel data={data} />
      <BoardingPanel data={data} reload={reload} />
      <section className="panel departures">
        <h3>
          <CalendarDays size={22} /> Upcoming Departures
        </h3>
        {(data?.departures || []).map((d) => (
          <div className="departure" key={d.id}>
            <b>{d.departure_time}</b>
            <span>{d.destination}</span>
            <em>{d.status}</em>
          </div>
        ))}
      </section>
      <div className="train-note">Train &nbsp; Gautrain: Which train should I catch?</div>
    </main>
  );
}
