#!/bin/bash
# Script to add DIRECT_URL to .env file

# Add DIRECT_URL after DATABASE_URL if it doesn't exist
if ! grep -q "DIRECT_URL" .env; then
    # Get the DATABASE_URL line and create DIRECT_URL by changing port
    DATABASE_LINE=$(grep "^DATABASE_URL=" .env)
    DIRECT_LINE=$(echo "$DATABASE_LINE" | sed 's/DATABASE_URL/DIRECT_URL/' | sed 's/:6543\//:5432\//')
    
    # Insert DIRECT_URL after DATABASE_URL
    sed -i.backup "/^DATABASE_URL=/a\\
$DIRECT_LINE
" .env
    
    echo "✅ Added DIRECT_URL to .env file"
    echo "📝 Backup saved as .env.backup"
else
    echo "ℹ️  DIRECT_URL already exists in .env"
fi

echo ""
echo "Current database configuration:"
grep -E "^(DATABASE_URL|DIRECT_URL)=" .env


