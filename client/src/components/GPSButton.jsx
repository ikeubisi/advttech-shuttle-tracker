import React from 'react';
import { MapPin } from 'lucide-react';
export default function GPSButton({ sharing, onToggle }) {
  return (
      <button className="share" onClick={onToggle}>
        <MapPin size={22} />
        {sharing ? 'Stop Sharing Location' : 'Start Sharing Location'}
      </button>

  );
}
