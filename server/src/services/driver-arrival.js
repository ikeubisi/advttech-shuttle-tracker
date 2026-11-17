import { getAssignedShuttles } from './assigned-shuttle.js';
import { processStopArrival } from './process-stop-arrival.js';
import { completeTripAtDestination } from './trip-completion.js';

export async function processDriverArrivals(client, driverId) {
  const shuttles = await getAssignedShuttles(client, driverId);

  const results = [];

  for (const shuttle of shuttles) {
    const result = await processStopArrival(client, shuttle.id);

    // The completion service independently checks for a recorded
    // destination visit and zero passengers remaining onboard.
    const completion = await completeTripAtDestination(
      client,
      shuttle.id,
    );

    results.push({
      shuttleId: shuttle.id,
      ...result,
      tripCompletion: completion,
    });
  }

  return results;
}
