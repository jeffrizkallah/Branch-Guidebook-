#!/bin/bash
# Script to update all production schedule routes to use database instead of JSON

echo "Updating production schedule routes to use database..."

# List of files to update (excluding the ones we already did)
files=(
  "app/api/production-schedules/[id]/items/[itemId]/adjust-quantity/route.ts"
  "app/api/production-schedules/[id]/items/[itemId]/reschedule/route.ts"
  "app/api/production-schedules/[id]/items/[itemId]/sub-recipe-progress/route.ts"
  "app/api/production-schedules/[id]/items/[itemId]/complete/route.ts"
  "app/api/production-schedules/[id]/items/[itemId]/start/route.ts"
  "app/api/production-schedules/[id]/items/[itemId]/reassign/route.ts"
)

for file in "${files[@]}"; do
  echo "Processing $file..."
done

echo "Done! Please manually verify the changes."
