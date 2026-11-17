import { distanceMeters, validCoordinates } from './boarding-gps.js';

export const ARRIVAL_RADIUS_M = 150;
export const MAX_GPS_AGE_MS = 30_000;
export const MAX_GPS_ACCURACY_M = 100;

export function detectStopArrival({
  gps,
  stop,
  now = Date.now(),
}) {
  if (!gps || !stop) {
    return { arrived: false, reason: 'GPS or stop unavailable' };
  }

  if (
    !validCoordinates(gps.lat, gps.lng) ||
    !validCoordinates(stop.lat, stop.lng)
  ) {
    return { arrived: false, reason: 'Invalid coordinates' };
  }

  const gpsTime = new Date(gps.updatedAt).getTime();

  if (
    !Number.isFinite(gpsTime) ||
    gpsTime > now ||
    now - gpsTime > MAX_GPS_AGE_MS
  ) {
    return { arrived: false, reason: 'GPS is stale' };
  }

  if (
    !Number.isFinite(gps.accuracy) ||
    gps.accuracy < 0 ||
    gps.accuracy > MAX_GPS_ACCURACY_M
  ) {
    return { arrived: false, reason: 'GPS accuracy insufficient' };
  }

  const distance = distanceMeters(
    gps.lat,
    gps.lng,
    stop.lat,
    stop.lng,
  );

  return {
    arrived: distance <= ARRIVAL_RADIUS_M,
    distanceMeters: Math.round(distance),
    reason: distance <= ARRIVAL_RADIUS_M
      ? 'Shuttle is at stop'
      : 'Shuttle has not reached stop',
  };
}

export const ARRIVAL_CONFIRMATION_MS = 5_000;

export function confirmStopArrival({
  previousGps,
  currentGps,
  stop,
  now = Date.now(),
}) {
  const previous = detectStopArrival({
    gps: previousGps,
    stop,
    now,
  });

  const current = detectStopArrival({
    gps: currentGps,
    stop,
    now,
  });

  if (!previous.arrived || !current.arrived) {
    return {
      confirmed: false,
      reason: 'Two valid GPS readings at the stop are required',
    };
  }

  const previousTime = new Date(previousGps.updatedAt).getTime();
  const currentTime = new Date(currentGps.updatedAt).getTime();

  if (
    currentTime <= previousTime ||
    currentTime - previousTime < ARRIVAL_CONFIRMATION_MS
  ) {
    return {
      confirmed: false,
      reason: 'GPS readings must be at least 5 seconds apart',
    };
  }

  return {
    confirmed: true,
    arrivedAt: new Date(currentTime).toISOString(),
    reason: 'Shuttle arrival confirmed',
  };
}
