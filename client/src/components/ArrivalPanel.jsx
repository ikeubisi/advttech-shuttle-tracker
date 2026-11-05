import React from 'react';
export default function ArrivalPanel({ data }) {
  const eta = data?.eta;
  return (
    <div className="arrival-panel">
      <strong>{data?.location ? 'Live shuttle' : 'GPS offline / waiting'}</strong>
      <span>{eta?.stopName ? 'Next stop: ' + eta.stopName : 'Next stop unavailable'}</span>
      <b>
        {eta?.minutes != null ? 'Estimated arrival: ' + eta.minutes + ' min' : 'ETA unavailable'}
      </b>
      <small>
        {eta?.note || 'Updates when fresh driver GPS is available; estimate excludes traffic.'}
      </small>
    </div>
  );
}
