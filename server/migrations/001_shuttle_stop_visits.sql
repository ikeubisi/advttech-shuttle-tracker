-- Intelligent shuttle departure lifecycle
-- Preparation only. Do not execute against PostgreSQL yet.

CREATE TABLE IF NOT EXISTS shuttle_stop_visits (
    id BIGSERIAL PRIMARY KEY,
    shuttle_id INTEGER NOT NULL REFERENCES shuttles(id),
    stop_id INTEGER NOT NULL REFERENCES stops(id),
    trip_id INTEGER REFERENCES trips(id),
    arrived_at TIMESTAMPTZ NOT NULL,
    ready_at TIMESTAMPTZ,
    ready_reason TEXT CHECK (
        ready_reason IN ('passenger_threshold', 'waiting_timeout')
    ),
    driver_confirmed_at TIMESTAMPTZ,
    departed_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT departure_requires_confirmation CHECK (
        departed_at IS NULL OR driver_confirmed_at IS NOT NULL
    ),
    CONSTRAINT confirmation_requires_readiness CHECK (
        driver_confirmed_at IS NULL OR ready_at IS NOT NULL
    ),
    CONSTRAINT completion_requires_departure CHECK (
        completed_at IS NULL OR departed_at IS NOT NULL
    ),
    CONSTRAINT valid_event_order CHECK (
        (ready_at IS NULL OR ready_at >= arrived_at)
        AND (
            driver_confirmed_at IS NULL
            OR (ready_at IS NOT NULL AND driver_confirmed_at >= ready_at)
        )
        AND (
            departed_at IS NULL
            OR (
                driver_confirmed_at IS NOT NULL
                AND departed_at >= driver_confirmed_at
            )
        )
        AND (
            completed_at IS NULL
            OR (departed_at IS NOT NULL AND completed_at >= departed_at)
        )
    )
);

CREATE UNIQUE INDEX IF NOT EXISTS
    shuttle_stop_visits_one_active_per_shuttle
ON shuttle_stop_visits(shuttle_id)
WHERE completed_at IS NULL;
