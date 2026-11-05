export function detectTripDirection(originStopId, stops) {
  if (!Number.isSafeInteger(originStopId)) {
    throw new Error('Invalid boarding stop');
  }

  if (!Array.isArray(stops) || stops.length !== 2) {
    throw new Error('Two stops are required');
  }

  const origin = stops.find((stop) => Number(stop.id) === originStopId);

  if (!origin) {
    throw new Error('Boarding stop not found');
  }

  const destination = stops.find((stop) => Number(stop.id) !== originStopId);

  if (!destination) {
    throw new Error('Destination stop not found');
  }

  return {
    originStopId: Number(origin.id),
    destinationStopId: Number(destination.id),
    originName: origin.name,
    destinationName: destination.name,
  };
}
