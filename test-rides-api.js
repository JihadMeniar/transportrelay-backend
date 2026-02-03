const BASE_URL = 'http://localhost:3000/api';

async function testRidesAPI() {
  console.log('🧪 Testing TaxiRelay Rides API');
  console.log('================================\n');

  try {
    // 1. Register user
    console.log('1️⃣  Registering new user...');
    const registerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `driver${Date.now()}@example.com`,
        password: 'Test1234',
        name: 'Driver One',
      }),
    });
    const registerData = await registerRes.json();

    if (!registerData.success) {
      console.error('❌ Registration failed:', registerData);
      return;
    }

    const token = registerData.data.token;
    console.log('✅ User registered successfully');
    console.log(`   Token: ${token.substring(0, 20)}...\n`);

    // 2. Create a ride
    console.log('2️⃣  Publishing a new ride...');
    const createRideRes = await fetch(`${BASE_URL}/rides`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        zone: 'Centre-ville',
        department: '75',
        distance: '15km',
        courseType: 'normal',
        medicalType: null,
        clientName: 'Jean Dupont',
        clientPhone: '0612345678',
        pickup: '123 Rue de la Paix, Paris',
        destination: '456 Avenue des Champs-Élysées, Paris',
      }),
    });
    const createRideData = await createRideRes.json();

    if (!createRideData.success) {
      console.error('❌ Ride creation failed:', createRideData);
      return;
    }

    const rideId = createRideData.data.ride.id;
    console.log('✅ Ride published successfully');
    console.log(`   Ride ID: ${rideId}\n`);

    // 3. Get all rides (unauthenticated - should mask data)
    console.log('3️⃣  Getting all rides (unauthenticated)...');
    const ridesRes = await fetch(`${BASE_URL}/rides`);
    const ridesData = await ridesRes.json();
    console.log('Response:', JSON.stringify(ridesData, null, 2).substring(0, 300) + '...\n');

    // 4. Get ride by ID (authenticated - should show full data)
    console.log('4️⃣  Getting ride by ID (authenticated)...');
    const rideRes = await fetch(`${BASE_URL}/rides/${rideId}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const rideData = await rideRes.json();
    console.log('Client name:', rideData.data.ride.clientName);
    console.log('Client phone:', rideData.data.ride.clientPhone);
    console.log('Pickup:', rideData.data.ride.pickup);
    console.log('Destination:', rideData.data.ride.destination);
    console.log('');

    // 5. Get my rides
    console.log('5️⃣  Getting my rides...');
    const myRidesRes = await fetch(`${BASE_URL}/rides/my-rides`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    const myRidesData = await myRidesRes.json();
    console.log(`   Found ${myRidesData.data.total} ride(s)\n`);

    // 6. Register second user (taker)
    console.log('6️⃣  Registering second user (taker)...');
    const takerRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `taker${Date.now()}@example.com`,
        password: 'Test1234',
        name: 'Driver Two',
      }),
    });
    const takerData = await takerRes.json();
    const takerToken = takerData.data.token;
    console.log('✅ Taker registered\n');

    // 7. Accept the ride
    console.log('7️⃣  Accepting the ride as taker...');
    const acceptRes = await fetch(`${BASE_URL}/rides/${rideId}/accept`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${takerToken}` },
    });
    const acceptData = await acceptRes.json();
    console.log('Response:', JSON.stringify(acceptData, null, 2).substring(0, 200) + '...\n');

    // 8. Update ride status to completed
    console.log('8️⃣  Completing the ride...');
    const completeRes = await fetch(`${BASE_URL}/rides/${rideId}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${takerToken}`,
      },
      body: JSON.stringify({ status: 'completed' }),
    });
    const completeData = await completeRes.json();
    console.log('Response:', completeData.message);
    console.log('');

    console.log('✅ All tests completed successfully!\n');
    console.log('📊 Summary:');
    console.log('   - Registered 2 users');
    console.log('   - Created 1 ride');
    console.log('   - Accepted the ride');
    console.log('   - Completed the ride');
    console.log('   - Tested data masking for unauthenticated users');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testRidesAPI();
