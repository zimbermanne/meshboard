#!/bin/sh
# Check if DATABASE_URL is available
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL variable is not set."
  exit 1
fi

echo "Running database migrations..."
# Run psql using the Railway connection string and feed it the schema file
psql "$DATABASE_URL" -f schema.sql
echo "Database tables successfully verified/created!"
