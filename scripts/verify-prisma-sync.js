const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Checking Prisma schema drift...');

try {
  // Try to create a migration without applying it
  const output = execSync('npx prisma migrate dev --create-only --name verify_sync_check', { encoding: 'utf-8' });
  
  if (output.includes('Already in sync')) {
    console.log('✅ Schema is fully in sync with migrations!');
    process.exit(0);
  }
  
  console.log(output);

  // If it created a migration, it means there was drift!
  console.error('\n❌ ERROR: Your schema.prisma has un-migrated changes!');
  console.error('❌ You MUST create a proper migration before committing your code.');
  console.error('❌ Run: npx prisma migrate dev --name <description>');
  
  // Find and delete the newly created dummy migration folder
  const migrationsDir = path.join(process.cwd(), 'prisma', 'migrations');
  const folders = fs.readdirSync(migrationsDir).filter(f => fs.statSync(path.join(migrationsDir, f)).isDirectory());
  const dummyFolder = folders.find(f => f.includes('verify_sync_check'));
  
  if (dummyFolder) {
    console.log(`🧹 Cleaning up dummy migration folder: ${dummyFolder}`);
    fs.rmSync(path.join(migrationsDir, dummyFolder), { recursive: true, force: true });
  }
  
  process.exit(1);

} catch (error) {
  console.error('\n❌ ERROR: Failed to run prisma migrate dev.');
  console.error(error.message);
  if (error.stdout) console.error(error.stdout);
  if (error.stderr) console.error(error.stderr);
  process.exit(1);
}
