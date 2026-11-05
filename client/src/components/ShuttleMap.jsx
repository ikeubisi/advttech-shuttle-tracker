import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Polyline, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
const marker = new L.Icon({
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
const initial = [[-26.1076, 28.0567], [-26.094, 28.071]];
const shuttleIcon = L.divIcon({
  className: 'shuttle-gps-marker',
  html: '<span aria-label="Shuttle">&#128652;</span>',
  iconSize: [42, 42],
  iconAnchor: [21, 21],
});
function FollowShuttle({ gps }) {
  const map = useMap();
  useEffect(() => {
    if (gps)
      map.flyTo([Number(gps.lat), Number(gps.lng)], Math.max(map.getZoom(), 14), {
        animate: true,
        duration: 1.2,
      });
  }, [gps?.lat, gps?.lng]);
  return null;
}
export default function ShuttleMap({ data }) {
  const [mapType, setMapType] = React.useState('road');
  const stops = (data?.stops || []).filter(
    (s) =>
      s.lat != null &&
      s.lng != null &&
      Number.isFinite(Number(s.lat)) &&
      Number.isFinite(Number(s.lng)),
  );
  const gps = data?.location;
  const center = gps
    ? [Number(gps.lat), Number(gps.lng)]
    : stops.length
      ? [Number(stops[0].lat), Number(stops[0].lng)]
      : initial[0];
  const trail = (data?.trail || []).map((p) => [Number(p.lat), Number(p.lng)]).reverse();
  return (
    <div className="map" style={{ position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 12,
          right: 12,
          zIndex: 1000,
          background: 'white',
          padding: 6,
          borderRadius: 8,
        }}
      >
        <select
          value={mapType}
          onChange={(e) => setMapType(e.target.value)}
          style={{ padding: 6, border: '1px solid #ccc', borderRadius: 6 }}
        >
          <option value="road">Road</option>
          <option value="satellite">Satellite</option>
          <option value="hybrid">Hybrid</option>
        </select>
      </div>
      <MapContainer
        center={center}
        zoom={14}
        scrollWheelZoom={true}
        dragging={true}
        touchZoom={true}
        doubleClickZoom={true}
        zoomControl={true}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          attribution="Tiles by Esri"
          url={
            mapType === 'road'
              ? 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}'
              : 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          }
        />
        {mapType === 'hybrid' && (
          <TileLayer
            attribution="Labels by Esri"
            url="https://services.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
          />
        )}
        {trail.length > 1 && (
          <Polyline positions={trail} pathOptions={{ color: '#12a66a', weight: 6, opacity: 0.8 }} />
        )}
        {stops
          .filter((s) => !/advtech|waterstone/i.test(s.name || ''))
          .map((s) => (
            <Marker key={s.id} position={[Number(s.lat), Number(s.lng)]} icon={marker}>
              <Popup>{s.name}</Popup>
            </Marker>
          ))}
        {gps && (
          <Marker position={[Number(gps.lat), Number(gps.lng)]} icon={shuttleIcon}>
            <Popup>
              {gps ? 'Live shuttle' : 'Awaiting GPS - placeholder only'} -{' '}
              {data?.eta?.minutes != null ? 'ETA ' + data.eta.minutes + ' min' : 'ETA calculating'}
            </Popup>
          </Marker>
        )}
        <FollowShuttle gps={gps} />
      </MapContainer>
    </div>
  );
}
