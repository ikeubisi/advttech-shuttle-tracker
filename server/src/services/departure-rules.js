export const WAITING_MINUTES = 15;
export const PASSENGER_THRESHOLD = 13;
export const WAITING_MS = WAITING_MINUTES * 60 * 1000;

export function calculateDepartureState({
  arrivedAt,
  passengerCount = 0,
  readyAt = null,
  driverConfirmedAt = null,
  departedAt = null,
  now = Date.now(),
}) {
  const arrivalTime = new Date(arrivedAt).getTime();

  if (!Number.isFinite(arrivalTime)) {
    throw new Error("Invalid shuttle arrival timestamp");
  }

  if (!Number.isSafeInteger(passengerCount) || passengerCount < 0) {
    throw new Error("Invalid passenger count");
  }

  const elapsedMs = Math.max(0, now - arrivalTime);
  const remainingMs = Math.max(0, WAITING_MS - elapsedMs);

  const thresholdReached = passengerCount >= PASSENGER_THRESHOLD;
  const waitingExpired = elapsedMs >= WAITING_MS;
  const ready = Boolean(readyAt) || thresholdReached || waitingExpired;

  let status = "Waiting";

  if (departedAt) {
    status = "Departed";
  } else if (driverConfirmedAt) {
    status = "Awaiting GPS Departure";
  } else if (ready) {
    status = "Awaiting Driver Confirmation";
  }

  return {
    status,
    passengerCount,
    passengerThreshold: PASSENGER_THRESHOLD,
    waitingMinutes: WAITING_MINUTES,
    remainingSeconds: Math.ceil(remainingMs / 1000),
    ready,
    readyReason: readyAt
      ? null
      : thresholdReached
        ? "passenger_threshold"
        : waitingExpired
          ? "waiting_timeout"
          : null,
    requiresDriverConfirmation: ready && !driverConfirmedAt && !departedAt,
  };
}
