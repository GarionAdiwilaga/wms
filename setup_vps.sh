#!/bin/bash
set -e

echo "===================================================="
echo "    Gudang Piala Kaltim WMS - VPS Setup Script"
echo "===================================================="

# 1. Check if running on Ubuntu/Debian
if [ -f /etc/debian_version ]; then
    echo "[*] OS: Debian/Ubuntu detected."
else
    echo "[!] Warning: This script is designed for Debian/Ubuntu systems."
    read -p "Do you want to proceed anyway? (y/N): " proceed
    if [[ ! $proceed =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# 2. Install Docker and Docker Compose if not present
if ! command -v docker &> /dev/null; then
    echo "[*] Installing Docker..."
    sudo apt-get update
    sudo apt-get install -y apt-transport-https ca-certificates curl gnupg lsb-release
    
    sudo mkdir -p /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    
    echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
    
    sudo apt-get update
    sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    
    # Add current user to docker group
    sudo usermod -aG docker $USER
    echo "[+] Docker installed successfully! Please note: you might need to re-login to run docker without sudo."
else
    echo "[✓] Docker is already installed."
fi

# 3. Setup environment configuration
if [ ! -f .env ]; then
    echo "[*] Creating .env file from .env.example..."
    cp .env.example .env
    
    # Generate secure random postgres password and JWT secret key
    DB_PASSWORD=$(openssl rand -hex 16)
    SECRET_KEY=$(openssl rand -hex 32)
    
    # Prompt for admin password
    echo "----------------------------------------------------"
    echo "Setup Production Admin Credentials:"
    read -sp "Enter INITIAL_ADMIN_PASSWORD for production: " admin_password
    echo ""
    if [ -z "$admin_password" ]; then
        admin_password="Admin123_ChangeMe"
        echo "[!] No password entered. Using default: $admin_password"
    fi
    echo "----------------------------------------------------"
    
    # Write to .env using sed
    sed -i "s/POSTGRES_PASSWORD=.*/POSTGRES_PASSWORD=$DB_PASSWORD/" .env
    sed -i "s/SECRET_KEY=.*/SECRET_KEY=$SECRET_KEY/" .env
    sed -i "s/INITIAL_ADMIN_PASSWORD=.*/INITIAL_ADMIN_PASSWORD=$admin_password/" .env
    
    echo "[✓] .env configuration file generated successfully."
else
    echo "[✓] .env file already exists. Skipping generation."
fi

# 4. Pull and build the containers
echo "[*] Building and starting production Docker containers..."
docker compose -f docker-compose.prod.yml up -d --build

# 5. Run Database Migrations
echo "[*] Waiting for Database to become healthy..."
# We wait up to 30 seconds for the database container to be healthy
for i in {1..30}; do
    if docker compose -f docker-compose.prod.yml ps db 2>/dev/null | grep -q "healthy"; then
        echo "[✓] Database is healthy!"
        break
    fi
    echo -n "."
    sleep 1
done

echo "[*] Running Database Migrations (Alembic)..."
docker compose -f docker-compose.prod.yml exec backend alembic upgrade head

echo "===================================================="
echo " ✅ VPS Deployment Setup Completed Successfully!"
echo "===================================================="
echo "Your WMS stack is now running locally on port 80."
echo ""
echo "Next Steps:"
echo "1. Verify container status: docker compose -f docker-compose.prod.yml ps"
echo "2. Set up your Cloudflare Tunnel to route rionlab.space to http://localhost:80"
echo "3. Visit your domain and log in using your admin credentials!"
echo "===================================================="
