// @ts-ignore
import { Client } from 'pg';
import bcrypt from 'bcryptjs';

const sourceUrl = 'postgresql://postgres:YiMIIDnCbSUfLznKqSJFYvHjmVmRJFhH@yamanote.proxy.rlwy.net:46017/railway';
const targetUrl = 'postgresql://postgres:EuiMDHVuFTjWxXOKQIwgIqmkLxVbkrOu@zephyr.proxy.rlwy.net:17127/railway';
const email = 'pizzastudio26@gmail.com';
const plaintextPassword = 'P!izzastudio2026';

async function updatePassword() {
  const hash = bcrypt.hashSync(plaintextPassword, 10);
  console.log(`Generated Bcrypt hash for "${plaintextPassword}": ${hash}`);

  for (const [name, url] of [['Old Database (Source)', sourceUrl], ['New Database (Target)', targetUrl]] as const) {
    const client = new Client({ connectionString: url });
    try {
      await client.connect();
      console.log(`Connected to ${name}.`);

      // 1. Check if ERP "User" table exists
      const erpTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'User'
        );
      `);

      if (erpTableCheck.rows[0].exists) {
        const updateErpRes = await client.query(`
          UPDATE "User"
          SET "passwordHash" = $1
          WHERE "email" = $2;
        `, [hash, email]);
        console.log(`✅ Updated ${updateErpRes.rowCount} user(s) in ${name} ERP "User" table.`);
      } else {
        console.log(`Table "User" does not exist in ${name}.`);
      }

      // 2. Check if Storefront "users" table exists
      const storefrontTableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);

      if (storefrontTableCheck.rows[0].exists) {
        const updateStorefrontRes = await client.query(`
          UPDATE "users"
          SET "password" = $1
          WHERE "email" = $2;
        `, [hash, email]);
        console.log(`✅ Updated ${updateStorefrontRes.rowCount} user(s) in ${name} Storefront "users" table.`);
      } else {
        console.log(`Table "users" does not exist in ${name}.`);
      }

    } catch (err) {
      console.error(`❌ Failed to update password in ${name}:`, err);
    } finally {
      await client.end();
      console.log(`Connection to ${name} closed.`);
    }
  }
}

updatePassword();
