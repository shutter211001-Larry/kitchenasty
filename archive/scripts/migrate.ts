// @ts-ignore
import { Client } from 'pg';

const sourceUrl = 'postgresql://postgres:YiMIIDnCbSUfLznKqSJFYvHjmVmRJFhH@yamanote.proxy.rlwy.net:46017/railway';
const targetUrl = 'postgresql://postgres:EuiMDHVuFTjWxXOKQIwgIqmkLxVbkrOu@zephyr.proxy.rlwy.net:17127/railway';

async function migrate() {
  const source = new Client({ connectionString: sourceUrl });
  const target = new Client({ connectionString: targetUrl });

  try {
    await source.connect();
    await target.connect();
    console.log('Successfully connected to both databases.');

    // 1. Get all base tables in the public schema (excluding prisma migrations if we want)
    const tablesRes = await source.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
      AND table_name NOT LIKE '_prisma_migrations';
    `);
    
    const tables = tablesRes.rows.map((r: any) => r.table_name);
    console.log(`Found ${tables.length} tables to migrate: ${tables.join(', ')}`);

    // 2. Temporarily disable foreign key constraints and triggers on target
    await target.query("SET session_replication_role = 'replica';");
    console.log('Disabled foreign key constraints and triggers on target database.');

    // 3. Truncate target tables first to ensure a clean copy
    console.log('Truncating tables on target database...');
    for (const table of tables) {
      await target.query(`TRUNCATE TABLE "${table}" CASCADE;`);
    }
    console.log('Target database cleaned successfully.');

    // 4. Migrate data table by table
    for (const table of tables) {
      console.log(`Migrating table "${table}"...`);
      const dataRes = await source.query(`SELECT * FROM "${table}";`);
      const rows = dataRes.rows;

      if (rows.length === 0) {
        console.log(`Table "${table}" has 0 rows. Skipping.`);
        continue;
      }

      const columns = Object.keys(rows[0]).map(col => `"${col}"`).join(', ');
      
      for (const row of rows) {
        const keys = Object.keys(row);
        const values = Object.values(row);
        const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
        
        await target.query(`
          INSERT INTO "${table}" (${columns}) 
          VALUES (${placeholders});
        `, values);
      }
      console.log(`Successfully copied ${rows.length} rows for table "${table}".`);
    }

    console.log('🎉 DATABASE MIGRATION COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Database migration failed:', err);
  } finally {
    // 5. Restore triggers and constraints
    try {
      await target.query("SET session_replication_role = 'origin';");
      console.log('Restored constraints and triggers on target database.');
    } catch (e) {
      console.error('Failed to restore constraints:', e);
    }

    await source.end();
    await target.end();
    console.log('Database connections closed.');
  }
}

migrate();
