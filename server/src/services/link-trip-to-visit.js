export async function linkTripToActiveVisit(client, {
  shuttleId,
  stopId,
  tripId,
}) {
  const shuttle = Number(shuttleId);
  const stop = Number(stopId);
  const trip = Number(tripId);

  if (
    !Number.isSafeInteger(shuttle) || shuttle <= 0 ||
    !Number.isSafeInteger(stop) || stop <= 0 ||
    !Number.isSafeInteger(trip) || trip <= 0
  ) {
    throw new Error('Invalid trip-to-visit information');
  }

  const result = await client.query(
    `UPDATE shuttle_stop_visits
     SET trip_id=$3
     WHERE shuttle_id=$1
       AND stop_id=$2
       AND completed_at IS NULL
       AND departed_at IS NULL
       AND (
         trip_id IS NULL
         OR trip_id=$3
         OR EXISTS (
           SELECT 1
           FROM trips previous_trip
           WHERE previous_trip.id=shuttle_stop_visits.trip_id
             AND previous_trip.ended_at IS NOT NULL
             AND previous_trip.destination_stop_id=$2
             AND previous_trip.shuttle_id=$1
         )
       )
     RETURNING id, shuttle_id, stop_id, trip_id`,
    [shuttle, stop, trip],
  );

  if (!result.rowCount) {
    return {
      linked: false,
      reason: 'No compatible active stop visit',
    };
  }

  return {
    linked: true,
    visit: result.rows[0],
  };
}
