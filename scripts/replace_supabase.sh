#!/bin/bash

# Script to replace Supabase imports with PostgreSQL query function

FILES=(
  "app/api/payment/create/route.ts"
  "app/api/payment/cryptopay/create/route.ts"
  "app/api/payment/cryptopay/webhook/route.ts"
  "app/api/payment/webhook/route.ts"
  "app/api/plans/route.ts"
  "app/api/user/route.ts"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "Processing $file..."

    # Backup original file
    cp "$file" "$file.bak"

    # Replace Supabase import with PostgreSQL
    sed -i "s/import { createClient } from '@supabase\/supabase-js'/import { query } from '@\/lib\/db'/g" "$file"

    # Remove Supabase client initialization
    sed -i '/const supabase = createClient(/,/)/d' "$file"

    echo "  ✓ Updated $file"
  else
    echo "  ✗ File not found: $file"
  fi
done

echo ""
echo "Done! Backup files created with .bak extension"
echo "Please manually update the query logic in each file to use PostgreSQL syntax"
