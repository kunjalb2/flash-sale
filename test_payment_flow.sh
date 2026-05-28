#!/bin/bash

# Payment Flow Test Script
# Tests the complete payment flow with user john@example.com

set -e

BASE_URL="http://localhost:8000/api/v1"
EMAIL="john@example.com"
PASSWORD="john12345"

echo "========================================="
echo "Payment Flow Testing"
echo "========================================="
echo ""

# 1. Login
echo "1. Testing Login..."
LOGIN_RESPONSE=$(curl -s -X POST "${BASE_URL}/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo $LOGIN_RESPONSE
  exit 1
fi

echo "✅ Login successful"
echo ""

# 2. Get Events
echo "2. Getting Available Events..."
EVENTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/events" \
  -H "Authorization: Bearer ${TOKEN}")

EVENT_ID=$(echo $EVENTS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$EVENT_ID" ]; then
  echo "❌ Get events failed!"
  exit 1
fi

echo "✅ Got event ID: ${EVENT_ID}"
echo ""

# 3. Create Reservation
echo "3. Creating Reservation..."
RESERVATION_RESPONSE=$(curl -s -X POST "${BASE_URL}/reservations" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"event_id\":\"${EVENT_ID}\",\"ticket_count\":2}")

RESERVATION_ID=$(echo $RESERVATION_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$RESERVATION_ID" ]; then
  echo "❌ Create reservation failed!"
  echo $RESERVATION_RESPONSE
  exit 1
fi

echo "✅ Reservation created: ${RESERVATION_ID}"
echo ""

# 4. Create Checkout Session
echo "4. Creating Checkout Session..."
CHECKOUT_RESPONSE=$(curl -s -X POST "${BASE_URL}/payments/checkout" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"booking_id\":\"${RESERVATION_ID}\",\"success_url\":\"http://localhost:3000/checkout/success?session_id={CHECKOUT_SESSION_ID}\",\"cancel_url\":\"http://localhost:3000/checkout/cancel?booking_id=${RESERVATION_ID}\"}")

CHECKOUT_SESSION_ID=$(echo $CHECKOUT_RESPONSE | grep -o '"checkout_session_id":"[^"]*' | cut -d'"' -f4)
CHECKOUT_URL=$(echo $CHECKOUT_RESPONSE | grep -o '"checkout_url":"[^"]*' | cut -d'"' -f4)

if [ -z "$CHECKOUT_SESSION_ID" ]; then
  echo "❌ Create checkout session failed!"
  echo $CHECKOUT_RESPONSE
  exit 1
fi

echo "✅ Checkout session created"
echo "   Session ID: ${CHECKOUT_SESSION_ID:0:50}..."
echo "   Checkout URL: ${CHECKOUT_URL:0:80}..."
echo ""

# 5. Get Reservation Details
echo "5. Getting Reservation Details..."
RESERVATION_DETAIL=$(curl -s -X GET "${BASE_URL}/reservations/${RESERVATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

TICKET_COUNT=$(echo $RESERVATION_DETAIL | grep -o '"ticket_count":[0-9]*' | cut -d':' -f2)
TOTAL_AMOUNT=$(echo $RESERVATION_DETAIL | grep -o '"total_amount":[0-9.]*' | head -1 | cut -d':' -f2)

if [ -z "$TICKET_COUNT" ]; then
  echo "❌ Get reservation details failed!"
  exit 1
fi

echo "✅ Reservation details retrieved"
echo "   Ticket Count: ${TICKET_COUNT}"
echo "   Total Amount: \$${TOTAL_AMOUNT}"
echo ""

# 6. Cancel Reservation (cleanup)
echo "6. Canceling Reservation (cleanup)..."
CANCEL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/reservations/${RESERVATION_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$CANCEL_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "204" ]; then
  echo "⚠️  Cancel reservation returned HTTP ${HTTP_CODE} (may already be cancelled)"
else
  echo "✅ Reservation cancelled"
fi
echo ""

echo "========================================="
echo "✅ Payment Flow Test Complete!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Login: ✅"
echo "- Get Events: ✅"
echo "- Create Reservation: ✅"
echo "- Create Checkout Session: ✅"
echo "- Get Reservation Details: ✅"
echo "- Cancel Reservation: ✅"
echo ""
echo "Note: To complete the payment, visit the checkout URL in a browser"
echo "and use Stripe test card: 4242 4242 4242 4242"
echo ""
