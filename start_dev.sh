#!/bin/bash

# Gudang Piala Kaltim WMS - Local Development Starter Script

echo "========================================================="
echo "🚀 Starting Gudang Piala Kaltim WMS Development Environment"
echo "========================================================="
echo ""

# 1. Start ALL Docker containers (DB, Backend, and Frontend)
echo "📦 Starting Database, Backend, and Frontend containers in the background..."
docker compose up -d

# Check if the docker command succeeded
if [ $? -ne 0 ]; then
    echo ""
    echo "❌ ERROR: Failed to start Docker containers."
    echo "Please make sure Docker Desktop or the Docker daemon is running on your laptop!"
    exit 1
fi

echo ""
echo "✅ Backend API is running at: http://localhost:8000"
echo "✅ Frontend is running at: http://localhost:5173"
echo "========================================================="
echo "You can view the live logs at any time by running:"
echo "docker compose logs -f"
