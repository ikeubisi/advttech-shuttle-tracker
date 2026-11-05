import React from 'react';
import { BusFront } from 'lucide-react';

export default function RouteBox({ data }) {
  return (
    <div className="route-box">
      <BusFront size={30} />
      <div>
        <strong>Active Route</strong>
        <b>
          {data?.route?.start_name || 'Sandton Gautrain Station'}
          <br />
          {data?.route?.end_name || 'ADvTECH 1 Waterstone'}
        </b>
      </div>
    </div>
  );
}
