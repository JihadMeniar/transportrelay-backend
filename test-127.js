const { Client } = require('pg');

const client = new Client({
  host: '127.0.0.1',  // Instead of localhost
  port: 5432,
  database: 'taxirelay',
  user: 'taxirelay_user',
  password: 'taxirelay_password',
});

console.log('Testing PostgreSQL connection with 127.0.0.1...');

client.connect()
  .then(() => {
    console.log('✅ Connected successfully!');
    return client.query('SELECT version()');
  })
  .then(result => {
    console.log('✅ Query result:', result.rows[0].version.substring(0, 70) + '...');
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
