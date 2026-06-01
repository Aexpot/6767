#!/bin/bash

set -e

echo "=== X0VPN Bot Installation Script ==="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check if running as root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (sudo)${NC}"
    exit 1
fi

echo -e "${GREEN}[1/8] Checking system requirements...${NC}"

# Check Node.js
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not found. Installing...${NC}"
    curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
    apt-get install -y nodejs
fi

# Check PostgreSQL
if ! command -v psql &> /dev/null; then
    echo -e "${YELLOW}PostgreSQL not found. Installing...${NC}"
    apt-get update
    apt-get install -y postgresql postgresql-contrib
    systemctl start postgresql
    systemctl enable postgresql
fi

# Check PM2
if ! command -v pm2 &> /dev/null; then
    echo -e "${YELLOW}PM2 not found. Installing...${NC}"
    npm install -g pm2
fi

# Check Nginx
if ! command -v nginx &> /dev/null; then
    echo -e "${YELLOW}Nginx not found. Installing...${NC}"
    apt-get install -y nginx
fi

echo -e "${GREEN}[2/8] Setting up database...${NC}"

# Generate random database password
DB_PASSWORD=$(openssl rand -base64 32 | tr -d "=+/" | cut -c1-25)
DB_NAME="x0vpn"
DB_USER="x0vpn_user"

# Create database and user
sudo -u postgres psql -c "DROP DATABASE IF EXISTS $DB_NAME;" 2>/dev/null || true
sudo -u postgres psql -c "DROP USER IF EXISTS $DB_USER;" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE $DB_NAME;"
sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASSWORD';"
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"
sudo -u postgres psql -d $DB_NAME -c "ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO $DB_USER;"

echo -e "${GREEN}[3/8] Importing database schema...${NC}"

# Import schema
PGPASSWORD="$DB_PASSWORD" psql -h localhost -U $DB_USER -d $DB_NAME -f database_schema.sql

echo -e "${GREEN}[4/8] Installing dependencies...${NC}"
npm install

echo -e "${GREEN}[5/8] Configuring environment...${NC}"

# Create .env file
cat > .env << EOF
# Database Configuration
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:5432/$DB_NAME"

# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN="YOUR_BOT_TOKEN_HERE"
TELEGRAM_CHANNEL_ID="YOUR_CHANNEL_ID_HERE"

# Admin Configuration
ADMIN_PASSWORD="admin123"
ADMIN_SECRET="$(openssl rand -hex 32)"

# Payment Systems
CRYPTOPAY_API_KEY=""
CRYSTALPAY_LOGIN=""
CRYSTALPAY_SECRET=""

# Application
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="production"
EOF

echo -e "${GREEN}[6/8] Building application...${NC}"
npm run build

echo -e "${GREEN}[7/8] Setting up PM2...${NC}"
pm2 delete x0vpn 2>/dev/null || true
pm2 start npm --name "x0vpn" -- start
pm2 save
pm2 startup

echo -e "${GREEN}[8/8] Setting up cron jobs...${NC}"

# Create cron script
cat > /usr/local/bin/check_vpn_subscriptions.sh << 'CRONEOF'
#!/bin/bash
cd /root/x0vpn_web
/usr/bin/node scripts/check_expiring_subscriptions.js
CRONEOF

chmod +x /usr/local/bin/check_vpn_subscriptions.sh

# Add to crontab
(crontab -l 2>/dev/null | grep -v check_vpn_subscriptions; echo "0 */6 * * * /usr/local/bin/check_vpn_subscriptions.sh") | crontab -

echo ""
echo -e "${GREEN}=== Installation Complete! ===${NC}"
echo ""
echo -e "${YELLOW}Database credentials:${NC}"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"
echo "  Password: $DB_PASSWORD"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Edit .env file and add your Telegram bot token:"
echo "   nano .env"
echo ""
echo "2. Restart the application:"
echo "   pm2 restart x0vpn"
echo ""
echo "3. Check logs:"
echo "   pm2 logs x0vpn"
echo ""
echo -e "${GREEN}Application is running on http://localhost:3000${NC}"
echo ""
