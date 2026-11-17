import { distanceMeters, validCoordinates } from './boarding-gps.js';

export const DEPARTURE_RADIUS_M = 200;
export const DEPARTURE_CONFIRMATION_MS = 5_000;
export const MAX_GPS_AGE_MS = 30_000;
export const MAX_GPS_ACCURACY_M = 100;

function validDepartureReading(gps, stop, now, confirmedAt) {
  if (!gps || !stop) return false;

  if (
    !validCoordinates(gps.lat, gps.lng) ||
    !validCoordinates(stop.lat, stop.lng)
  ) return false;

  const timestamp = new Date(gps.updatedAt).getTime();

  if (
    !Number.isFinite(timestamp) ||
    timestamp > now ||
    now - timestamp > MAX_GPS_AGE_MS ||
    timestamp <= confirmedAt
  ) return false;

  if (
    !Number.isFinite(gps.accuracy) ||
    gps.accuracy < 0 ||
    gps.accuracy > MAX_GPS_ACCURACY_M
  ) return false;

  return distanceMeters(
    gps.lat,
    gps.lng,
    stop.lat,
    stop.lng,
  ) > DEPARTURE_RADIUS_M + gps.accuracy;
}

export function confirmStopDeparture({
  previousGps,
  currentGps,
  stop,
  driverConfirmedAt,
  now = Date.now(),
}) {
  const confirmedAt =
    driverConfirmedAt === null ||
    driverConfirmedAt === undefined ||
    driverConfirmedAt === ''
      ? NaN
      : new Date(driverConfirmedAt).getTime();

  if (!Number.isFinite(confirmedAt)) {
    return { confirmed: false, reason: 'Driver confirmation required' };
  }

  if (
    !validDepartureReading(previousGps, stop, now, confirmedAt) ||
    !validDepartureReading(currentGps, stop, now, confirmedAt)
  ) {
    return {
      confirmed: false,
      reason: 'Two fresh GPS readings outside the stop are required',
    };
  }

  const previousTime = new Date(previousGps.updatedAt).getTime();
  const currentTime = new Date(currentGps.updatedAt).getTime();

  if (
    currentTime <= previousTime ||
    currentTime - previousTime < DEPARTURE_CONFIRMATION_MS
  ) {
    return {
      confirmed: false,
      reason: 'GPS readings must be at least 5 seconds apart',
    };
  }

  return {
    confirmed: true,
    departedAt: new Date(currentTime).toISOString(),
    reason: 'GPS departure confirmed',
  };
}
