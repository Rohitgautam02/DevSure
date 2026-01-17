#!/bin/bash
set -e

echo "🔄 Running database migrations..."
npx prisma db push --accept-data-loss

echo "✅ Migrations complete. Starting server..."
npm start
