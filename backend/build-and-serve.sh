#!/bin/bash

# Script to build React app and start the server

echo "Building React application..."
cd ../frontend
npm run build

if [ $? -eq 0 ]; then
    echo "Build successful!"
    echo "Starting backend server..."
    cd ../backend
    node server.js
else
    echo "Build failed! Please check the errors above."
    exit 1
fi

