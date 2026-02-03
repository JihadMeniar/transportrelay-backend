const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'taxirelay',
  user: 'taxirelay_user',
  // NO PASSWORD
});

console.log('Testing PostgreSQL connection WITHOUT password...');

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('✅ Query result:', result.rows[0].version);
    return client.end();
  })
  .then(() => {
    console.log('✅ Connection closed');
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Connection failed:', err.message);
    process.exit(1);
  });
