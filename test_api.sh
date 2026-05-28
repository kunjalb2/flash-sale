#!/bin/bash

# Flash Sale API Test Script
# Tests all major endpoints with user john@example.com

set -e

BASE_URL="http://localhost:8000/api/v1"
EMAIL="john@example.com"
PASSWORD="john12345"

echo "========================================="
echo "Flash Sale API Testing"
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
echo "Token: ${TOKEN:0:50}..."
echo ""

# 2. Get Events
echo "2. Testing Get Events..."
EVENTS_RESPONSE=$(curl -s -X GET "${BASE_URL}/events" \
  -H "Authorization: Bearer ${TOKEN}")

EVENT_ID=$(echo $EVENTS_RESPONSE | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$EVENT_ID" ]; then
  echo "❌ Get events failed!"
  echo $EVENTS_RESPONSE
  exit 1
fi

echo "✅ Get events successful"
echo "First Event ID: ${EVENT_ID}"
echo ""

# 3. Get Event Details
echo "3. Testing Get Event Details..."
EVENT_DETAIL=$(curl -s -X GET "${BASE_URL}/events/${EVENT_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

EVENT_TITLE=$(echo $EVENT_DETAIL | grep -o '"title":"[^"]*' | cut -d'"' -f4)

if [ -z "$EVENT_TITLE" ]; then
  echo "❌ Get event details failed!"
  echo $EVENT_DETAIL
  exit 1
fi

echo "✅ Get event details successful"
echo "Event: ${EVENT_TITLE}"
echo ""

# 4. Create Reservation
echo "4. Testing Create Reservation..."
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

echo "✅ Create reservation successful"
echo "Reservation ID: ${RESERVATION_ID}"
echo ""

# 5. Get Reservation Details
echo "5. Testing Get Reservation Details..."
RESERVATION_DETAIL=$(curl -s -X GET "${BASE_URL}/reservations/${RESERVATION_ID}" \
  -H "Authorization: Bearer ${TOKEN}")

TICKET_COUNT=$(echo $RESERVATION_DETAIL | grep -o '"ticket_count":[0-9]*' | cut -d':' -f2)

if [ -z "$TICKET_COUNT" ]; then
  echo "❌ Get reservation details failed!"
  echo $RESERVATION_DETAIL
  exit 1
fi

echo "✅ Get reservation details successful"
echo "Ticket Count: ${TICKET_COUNT}"
echo ""

# 6. List User Bookings
echo "6. Testing List User Bookings..."
BOOKINGS_RESPONSE=$(curl -s -X GET "${BASE_URL}/reservations" \
  -H "Authorization: Bearer ${TOKEN}")

TOTAL_BOOKINGS=$(echo $BOOKINGS_RESPONSE | grep -o '"total":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$TOTAL_BOOKINGS" ]; then
  echo "❌ List bookings failed!"
  echo $BOOKINGS_RESPONSE
  exit 1
fi

echo "✅ List bookings successful"
echo "Total Bookings: ${TOTAL_BOOKINGS}"
echo ""

# 7. Cancel Reservation
echo "7. Testing Cancel Reservation..."
CANCEL_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${BASE_URL}/reservations/${RESERVATION_ID}/cancel" \
  -H "Authorization: Bearer ${TOKEN}")

HTTP_CODE=$(echo "$CANCEL_RESPONSE" | tail -n1)

if [ "$HTTP_CODE" != "204" ]; then
  echo "❌ Cancel reservation failed! HTTP Code: ${HTTP_CODE}"
  echo $CANCEL_RESPONSE
  exit 1
fi

echo "✅ Cancel reservation successful"
echo ""

# 8. Create Another Reservation for Confirmation Test
echo "8. Testing Create Another Reservation..."
RESERVATION_RESPONSE2=$(curl -s -X POST "${BASE_URL}/reservations" \
  -H 'Content-Type: application/json' \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"event_id\":\"${EVENT_ID}\",\"ticket_count\":1}")

RESERVATION_ID2=$(echo $RESERVATION_RESPONSE2 | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$RESERVATION_ID2" ]; then
  echo "❌ Create second reservation failed!"
  echo $RESERVATION_RESPONSE2
  exit 1
fi

echo "✅ Create second reservation successful"
echo "Reservation ID: ${RESERVATION_ID2}"
echo ""

# 9. Confirm Reservation
echo "9. Testing Confirm Reservation..."
CONFIRM_RESPONSE=$(curl -s -X POST "${BASE_URL}/reservations/${RESERVATION_ID2}/confirm" \
  -H "Authorization: Bearer ${TOKEN}")

BOOKING_STATUS=$(echo $CONFIRM_RESPONSE | grep -o '"status":"[^"]*' | cut -d'"' -f4)

if [ "$BOOKING_STATUS" != "confirmed" ]; then
  echo "❌ Confirm reservation failed!"
  echo $CONFIRM_RESPONSE
  exit 1
fi

echo "✅ Confirm reservation successful"
echo "Status: ${BOOKING_STATUS}"
echo ""

# 10. Get Booking Details
echo "10. Testing Get Booking Details..."
BOOKING_DETAIL=$(curl -s -X GET "${BASE_URL}/reservations/bookings/${RESERVATION_ID2}" \
  -H "Authorization: Bearer ${TOKEN}")

BOOKING_ID=$(echo $BOOKING_DETAIL | grep -o '"id":"[^"]*' | head -1 | cut -d'"' -f4)

if [ -z "$BOOKING_ID" ]; then
  echo "❌ Get booking details failed!"
  echo $BOOKING_DETAIL
  exit 1
fi

echo "✅ Get booking details successful"
echo "Booking ID: ${BOOKING_ID}"
echo ""

echo "========================================="
echo "✅ All Tests Passed!"
echo "========================================="
echo ""
echo "Summary:"
echo "- Login: ✅"
echo "- Get Events: ✅"
echo "- Get Event Details: ✅"
echo "- Create Reservation: ✅"
echo "- Get Reservation Details: ✅"
echo "- List User Bookings: ✅"
echo "- Cancel Reservation: ✅"
echo "- Confirm Reservation: ✅"
echo "- Get Booking Details: ✅"
echo ""
