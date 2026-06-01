import pg from 'pg';
const { Client } = pg;

const connectionString = 'postgresql://postgres:YiMIIDnCbSUfLznKqSJFYvHjmVmRJFhH@yamanote.proxy.rlwy.net:46017/railway';

async function main() {
  const client = new Client({ connectionString });
  await client.connect();
  console.log('Connected to Railway database');
  
  const res = await client.query(`
    SELECT table_name, table_schema
    FROM information_schema.tables 
    WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('pg_catalog', 'information_schema')
    ORDER BY table_schema, table_name;
  `);
  
  console.log('Tables found:');
  for (const row of res.rows) {
    console.log(`- [${row.table_schema}] ${row.table_name}`);
  }
  
  await client.end();
}

main().catch(console.error);
