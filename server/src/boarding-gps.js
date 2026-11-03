export const GPS_MAX_AGE_MS = 30000;
export const GPS_MAX_ACCURACY_M = 100;
export const STOP_RADIUS_M = 150;
export const SHUTTLE_RADIUS_M = 150;

export function distanceMeters(lat1, lng1, lat2, lng2) {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * rad) *
    Math.cos(lat2 * rad) *
    Math.sin(dLng / 2) ** 2;

  return 6371000 * 2 * Math.atan2(
    Math.sqrt(a),
    Math.sqrt(Math.max(0, 1 - a))
  );
}

export function validCoordinates(lat, lng) {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    Number.isFinite(lat) &&
    Number.isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

export function verifyGps({
  passenger,
  shuttle,
  stop,
  now = Date.now()
}) {
  if (
    !validCoordinates(passenger.lat, passenger.lng) ||
    !validCoordinates(shuttle.lat, shuttle.lng) ||
    !validCoordinates(stop.lat, stop.lng)
  ) {
    return { ok: false, error: 'Invalid GPS coordinates' };
  }

  const passengerTime = Number(passenger.timestamp);
  const shuttleTime = new Date(shuttle.updatedAt).getTime();

  if (
    !Number.isFinite(passengerTime) ||
    !Number.isFinite(shuttleTime) ||
    passengerTime > now + 5000 ||
    shuttleTime > now + 5000 ||
    now - passengerTime > GPS_MAX_AGE_MS ||
    now - shuttleTime > GPS_MAX_AGE_MS
  ) {
    return {
      ok: false,
      error: 'GPS is outdated. Refresh your location and try again.'
    };
  }

  if (
    typeof passenger.accuracy !== 'number' ||
    !Number.isFinite(passenger.accuracy) ||
    passenger.accuracy < 0 ||
    passenger.accuracy > GPS_MAX_ACCURACY_M ||
    typeof shuttle.accuracy !== 'number' ||
    !Number.isFinite(shuttle.accuracy) ||
    shuttle.accuracy < 0 ||
    shuttle.accuracy > GPS_MAX_ACCURACY_M
  ) {
    return {
      ok: false,
      error: 'GPS accuracy is too low. Move to an open area and retry.'
    };
  }

  const passengerToStop = distanceMeters(
    passenger.lat, passenger.lng,
    stop.lat, stop.lng
  );

  const shuttleToStop = distanceMeters(
    shuttle.lat, shuttle.lng,
    stop.lat, stop.lng
  );

  const passengerToShuttle = distanceMeters(
    passenger.lat, passenger.lng,
    shuttle.lat, shuttle.lng
  );

  if (
    passengerToStop > STOP_RADIUS_M ||
    shuttleToStop > STOP_RADIUS_M ||
    passengerToShuttle > SHUTTLE_RADIUS_M
  ) {
    return {
      ok: false,
      error: 'You and the shuttle must be near the selected stop.'
    };
  }

  return {
    ok: true,
    passengerToStop: Math.round(passengerToStop),
    shuttleToStop: Math.round(shuttleToStop),
    passengerToShuttle: Math.round(passengerToShuttle)
  };
}
