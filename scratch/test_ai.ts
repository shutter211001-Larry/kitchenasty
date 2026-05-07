import 'dotenv/config';
import { translateFields, translateContent } from './packages/server/src/lib/ai.js';

async function run() {
  console.log('Testing translateContent...');
  const res1 = await translateContent('Apple', ['es', 'fr'], 'en');
  console.log('translateContent result:', res1);

  console.log('\nTesting translateFields...');
  const res2 = await translateFields([
    { key: 'name', value: 'Apple' },
    { key: 'description', value: 'A red fruit' }
  ], ['es', 'fr']);
  console.log('translateFields result:', res2);
}

run();
