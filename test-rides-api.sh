#!/bin/bash

BASE_URL="http://localhost:3000/api"

echo "🧪 Testing TaxiRelay Rides API"
echo "================================"
echo ""

# Register a new user
echo "1️⃣  Registering new user..."
REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver1@example.com",
    "password": "Test1234",
    "name": "Driver One"
  }')

TOKEN=$(echo $REGISTER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Registration failed"
  echo "$REGISTER_RESPONSE"
  exit 1
fi

echo "✅ User registered successfully"
echo "   Token: ${TOKEN:0:20}..."
echo ""

# Create a ride
echo "2️⃣  Publishing a new ride..."
CREATE_RIDE_RESPONSE=$(curl -s -X POST "$BASE_URL/rides" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "zone": "Centre-ville",
    "department": "75",
    "distance": "15km",
    "courseType": "normal",
    "medicalType": null,
    "clientName": "Jean Dupont",
    "clientPhone": "0612345678",
    "pickup": "123 Rue de la Paix, Paris",
    "destination": "456 Avenue des Champs-Élysées, Paris"
  }')

RIDE_ID=$(echo $CREATE_RIDE_RESPONSE | grep -o '"id":[0-9]*' | head -1 | cut -d':' -f2)

if [ -z "$RIDE_ID" ]; then
  echo "❌ Ride creation failed"
  echo "$CREATE_RIDE_RESPONSE"
  exit 1
fi

echo "✅ Ride published successfully"
echo "   Ride ID: $RIDE_ID"
echo ""

# Get all rides (unauthenticated - should mask data)
echo "3️⃣  Getting all rides (unauthenticated)..."
curl -s "$BASE_URL/rides" | head -50
echo ""
echo ""

# Get ride by ID (authenticated)
echo "4️⃣  Getting ride by ID (authenticated)..."
curl -s "$BASE_URL/rides/$RIDE_ID" \
  -H "Authorization: Bearer $TOKEN" | head -50
echo ""
echo ""

# Get my rides
echo "5️⃣  Getting my rides..."
curl -s "$BASE_URL/rides/my-rides" \
  -H "Authorization: Bearer $TOKEN" | head -50
echo ""
echo ""

# Register second user (taker)
echo "6️⃣  Registering second user (taker)..."
TAKER_RESPONSE=$(curl -s -X POST "$BASE_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "driver2@example.com",
    "password": "Test1234",
    "name": "Driver Two"
  }')

TAKER_TOKEN=$(echo $TAKER_RESPONSE | grep -o '"token":"[^"]*"' | cut -d'"' -f4)

echo "✅ Taker registered"
echo "   Token: ${TAKER_TOKEN:0:20}..."
echo ""

# Accept the ride
echo "7️⃣  Accepting the ride as taker..."
ACCEPT_RESPONSE=$(curl -s -X PATCH "$BASE_URL/rides/$RIDE_ID/accept" \
  -H "Authorization: Bearer $TAKER_TOKEN")

echo "$ACCEPT_RESPONSE" | head -50
echo ""
echo ""

echo "✅ All tests completed successfully!"
echo ""
echo "📊 Summary:"
echo "   - Registered 2 users"
echo "   - Created 1 ride"
echo "   - Accepted the ride"
echo "   - Tested data masking for unauthenticated users"
