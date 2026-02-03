const { Client } = require('pg');

// Test avec connection string
const connectionString = 'postgresql://taxirelay_user:taxirelay_password@localhost:5432/taxirelay';

console.log('Testing with connection string:', connectionString);

const client = new Client({
  connectionString,
});

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query('SELECT NOW(), version()');
  })
  .then(result => {
    console.log('✅ Query result:');
    console.log('  Time:', result.rows[0].now);
    console.log('  Version:', result.rows[0].version.substring(0, 50) + '...');
    return client.end();
  })
  .then(() => {
    console.log('✅ Connection closed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    console.error('Error code:', err.code);
    process.exit(1);
  });
