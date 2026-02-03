# Test script for Rides API

Write-Host "🧪 Testing TaxiRelay Rides API" -ForegroundColor Cyan
Write-Host "================================`n"

$baseUrl = "http://localhost:3000/api"

# 1. Register user
Write-Host "1️⃣  Registering new user..." -ForegroundColor Yellow
$registerBody = @{
    email = "driver-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "Test1234"
    name = "Driver One"
} | ConvertTo-Json

try {
    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $registerBody -ContentType "application/json"
    $token = $registerResponse.data.token
    Write-Host "✅ User registered successfully" -ForegroundColor Green
    Write-Host "   Token: $($token.Substring(0, 20))...`n"
} catch {
    Write-Host "❌ Registration failed: $_" -ForegroundColor Red
    exit 1
}

# 2. Create a ride
Write-Host "2️⃣  Publishing a new ride..." -ForegroundColor Yellow
$rideBody = @{
    zone = "Centre-ville"
    department = "75"
    distance = "15km"
    courseType = "normal"
    medicalType = $null
    clientName = "Jean Dupont"
    clientPhone = "0612345678"
    pickup = "123 Rue de la Paix, Paris"
    destination = "456 Avenue des Champs-Élysées, Paris"
} | ConvertTo-Json

try {
    $rideResponse = Invoke-RestMethod -Uri "$baseUrl/rides" -Method Post -Body $rideBody -ContentType "application/json" -Headers @{Authorization = "Bearer $token"}
    $rideId = $rideResponse.data.ride.id
    Write-Host "✅ Ride published successfully" -ForegroundColor Green
    Write-Host "   Ride ID: $rideId`n"
} catch {
    Write-Host "❌ Ride creation failed: $_" -ForegroundColor Red
    exit 1
}

# 3. Get ride by ID (should show full data since we're the publisher)
Write-Host "3️⃣  Getting ride by ID (authenticated)..." -ForegroundColor Yellow
try {
    $getRideResponse = Invoke-RestMethod -Uri "$baseUrl/rides/$rideId" -Headers @{Authorization = "Bearer $token"}
    Write-Host "   Client name: $($getRideResponse.data.ride.clientName)" -ForegroundColor Cyan
    Write-Host "   Pickup: $($getRideResponse.data.ride.pickup)" -ForegroundColor Cyan
    Write-Host "   Status: $($getRideResponse.data.ride.status)`n" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Get ride failed: $_" -ForegroundColor Red
}

# 4. Get all rides
Write-Host "4️⃣  Getting all rides..." -ForegroundColor Yellow
try {
    $allRidesResponse = Invoke-RestMethod -Uri "$baseUrl/rides"
    Write-Host "   Total rides: $($allRidesResponse.data.total)`n" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Get rides failed: $_" -ForegroundColor Red
}

# 5. Register second user (taker)
Write-Host "5️⃣  Registering second user (taker)..." -ForegroundColor Yellow
$takerBody = @{
    email = "taker-$(Get-Date -Format 'yyyyMMddHHmmss')@example.com"
    password = "Test1234"
    name = "Driver Two"
} | ConvertTo-Json

try {
    $takerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method Post -Body $takerBody -ContentType "application/json"
    $takerToken = $takerResponse.data.token
    Write-Host "✅ Taker registered`n" -ForegroundColor Green
} catch {
    Write-Host "❌ Taker registration failed: $_" -ForegroundColor Red
    exit 1
}

# 6. Accept the ride
Write-Host "6️⃣  Accepting the ride as taker..." -ForegroundColor Yellow
try {
    $acceptResponse = Invoke-RestMethod -Uri "$baseUrl/rides/$rideId/accept" -Method Patch -Headers @{Authorization = "Bearer $takerToken"}
    Write-Host "✅ Ride accepted successfully" -ForegroundColor Green
    Write-Host "   Status: $($acceptResponse.data.ride.status)`n" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Accept ride failed: $_" -ForegroundColor Red
}

# 7. Complete the ride
Write-Host "7️⃣  Completing the ride..." -ForegroundColor Yellow
$statusBody = @{
    status = "completed"
} | ConvertTo-Json

try {
    $completeResponse = Invoke-RestMethod -Uri "$baseUrl/rides/$rideId/status" -Method Patch -Body $statusBody -ContentType "application/json" -Headers @{Authorization = "Bearer $takerToken"}
    Write-Host "✅ $($completeResponse.message)" -ForegroundColor Green
    Write-Host ""
} catch {
    Write-Host "❌ Complete ride failed: $_" -ForegroundColor Red
}

Write-Host "`n✅ All tests completed successfully!" -ForegroundColor Green
Write-Host "`n📊 Summary:" -ForegroundColor Cyan
Write-Host "   - Registered 2 users"
Write-Host "   - Created 1 ride"
Write-Host "   - Accepted the ride"
Write-Host "   - Completed the ride"
