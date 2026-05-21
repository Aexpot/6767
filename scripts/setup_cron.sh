#!/bin/bash

# Add cron job to check expiring subscriptions twice a day (at 9 AM and 9 PM)
CRON_JOB="0 9,21 * * * /root/.nvm/versions/node/v22.22.2/bin/node scripts/check_expiring_subscriptions.js >> /var/log/championvpn_notifications.log 2>&1"

# Check if cron job already exists
(crontab -l 2>/dev/null | grep -v "check_expiring_subscriptions.js"; echo "$CRON_JOB") | crontab -

echo "✅ Cron job added: Check expiring subscriptions at 9 AM and 9 PM daily"
echo "Log file: /var/log/championvpn_notifications.log"
