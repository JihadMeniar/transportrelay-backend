const { Client } = require('pg');

const client = new Client({
  host: 'localhost',
  port: 5432,
  database: 'taxirelay',
  user: 'taxirelay_user',
  password: 'taxirelay_password',
});

console.log('Testing PostgreSQL connection...');
console.log('Config:', {
  host: client.host,
  port: client.port,
  database: client.database,
  user: client.user,
  password: client.password ? client.password.substring(0, 3) + '***' : 'undefined',
});

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
    console.error('Full error:', err);
    process.exit(1);
  });
