#!/bin/bash

# Exit immediately if a command exits with a non-zero status.
set -e

echo "--- Building Frontend ---"
# 1. Go into the frontend directory
cd frontend
# 2. Install dependencies and run the build
npm install
npm run build
# 3. Go back to the root directory
cd ..

echo "--- Preparing Functions ---"
# 4. Create a 'functions' folder inside the frontend's publish directory
mkdir -p frontend/dist/functions
# 5. Copy your compiled function files into that new folder
cp -r netlify/functions/* frontend/dist/functions/

echo "--- Build Complete ---"