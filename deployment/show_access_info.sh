#!/bin/sh

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Initialize variables
TOKEN=""
URL=""
MAX_RETRIES=60 # 60 * 2s = 120 seconds timeout
COUNT=0

echo "Waiting for services to provide access info..."

while [ -z "$TOKEN" ] || [ -z "$URL" ]; do
    # Try to get Token if not found yet
    if [ -z "$TOKEN" ]; then
        TOKEN=$(docker logs contest-backend 2>&1 | grep "Admin Token:" | tail -n 1 | awk -F ': ' '{print $2}')
    fi

    # Try to get URL if not found yet
    if [ -z "$URL" ]; then
        URL=$(docker logs contest-tunnel 2>&1 | grep -o 'https://.*\.trycloudflare\.com' | tail -n 1)
    fi

    # If both found, break
    if [ -n "$TOKEN" ] && [ -n "$URL" ]; then
        break
    fi

    # Check timeout
    if [ $COUNT -ge $MAX_RETRIES ]; then
        echo -e "${YELLOW}Timeout waiting for access info. Services might be slow or failed to start.${NC}"
        break
    fi

    COUNT=$((COUNT+1))
    sleep 2
done

echo ""
printf "${BLUE}=================================================${NC}\n"
printf "${BLUE}                   ACCESS INFO                   ${NC}\n"
printf "${BLUE}=================================================${NC}\n"
echo ""
if [ -n "$TOKEN" ]; then
    printf "🔑 Admin Token: ${GREEN}%s${NC}\n" "$TOKEN"
else
    printf "❌ Admin Token: ${YELLOW}Not Found (Check backend logs)${NC}\n"
fi

if [ -n "$URL" ]; then
    printf "🌍 Public URL:  ${GREEN}%s${NC}\n" "$URL"
else
    printf "❌ Public URL:  ${YELLOW}Not Found (Check tunnel logs)${NC}\n"
fi
echo ""
printf "${BLUE}=================================================${NC}\n"
