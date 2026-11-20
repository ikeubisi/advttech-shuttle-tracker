# ADvTECH Shuttle Tracker

A web-based shuttle management and tracking application supporting passenger, driver, and administrator workflows.

## Overview

ADvTECH Shuttle Tracker provides a centralized interface for managing shuttle operations, monitoring trips, recording arrivals and departures, and viewing shuttle GPS information.

Users access the application through a web browser, with interfaces tailored to their assigned roles.

## Technology Stack

| Component | Technology |
|---|---|
| Frontend | React, Vite, JavaScript |
| Backend | Node.js, Express |
| Database | PostgreSQL |
| Maps | Leaflet, OpenStreetMap |
| Development | Visual Studio Code, Git, GitHub |
| Deployment | Cloud-hosted web application |

## Application Features

### Passenger
- View shuttle information and available routes.
- Access departure and arrival information.
- View reported shuttle GPS positions.

### Driver
- Access assigned shuttle operations.
- Share GPS location with browser permission.
- Manage supported arrival and departure workflows.

### Administrator
- Access the administrative dashboard.
- Manage supported user accounts.
- Monitor shuttle operations and related information.

## Project Structure

```text
client/             React frontend
  src/components/   Shared interface components
  src/pages/        Passenger, driver and admin pages
  src/services/     Frontend API communication

server/             Node.js backend
  src/routes/       API endpoints
  src/services/     Application business logic
  src/database/     Database-related modules
  migrations/       Database schema changes

README.md           Project documentation
package.json        Root project scripts
```

## Local Development

### Prerequisites

- Node.js 22 or later
- PostgreSQL
- npm

### Installation

```powershell
npm install
npm --prefix client install
npm --prefix server install
Copy-Item server/.env.example server/.env
```

Configure the local `server/.env` file with the appropriate database connection and application settings.

Never commit credentials or production secrets to Git.

### Database Setup

Database migrations require technical review before use. The included scripts do not yet define a complete schema compatible with all application routes. Do not run them against production.

```powershell
# Migration requires schema reconciliation before execution
```

For a new database only, where appropriate:

```powershell
# Seed only after database schema compatibility is confirmed
```

Do not seed an existing production database without reviewing the script and its effects.

### Start the Application

```powershell
npm run dev
```

The frontend development server normally runs at `http://localhost:5173`.

## GPS and Mapping

Driver GPS updates rely on browser geolocation permissions. Mobile devices generally require HTTPS for geolocation outside localhost.

Browser background restrictions may interrupt GPS updates. Map tiles require network access unless an approved offline tile service is configured.

The application distinguishes recent GPS updates from unavailable or outdated location information.

Route coordinates and schedules must be verified against operational data before relying on them.

## Security and Operational Considerations

- Protect database credentials and environment variables.
- Use HTTPS in production.
- Apply appropriate authentication and authorization controls.
- Follow organizational location-tracking and privacy policies.
- Review account recovery procedures before production use.
- Verify database migrations and backup procedures.

## Technical Review

The repository includes application source code, database migration scripts, and backend tests for technical assessment.

Reviewers should verify dependency security, database compatibility, role-based access controls, GPS behavior, and deployment configuration before making production changes.

### Database Schema Compatibility

The application currently relies on an existing PostgreSQL schema.

The included migration and seed scripts require reconciliation with the current application queries before they can be used for a fresh installation. In particular, the authentication routes expect `email`, `name`, and `is_active` columns, while the existing migration creates `username` and `display_name`.

The application also references operational tables including `shuttles`, `trips`, and `passenger_boardings` that are not fully defined by the included migration scripts.

Before deploying a new environment, verify the complete database schema, required constraints, and migration order.

Do not execute migrations or seed scripts against a production database without a reviewed backup and deployment plan.
