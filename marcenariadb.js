const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres', // your PostgreSQL username
  host: 'localhost',
  database: 'marcenaria_db',
  password: 'postgres', // your PostgreSQL password
  port: 5432,
});

module.exports = { pool };