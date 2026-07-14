const fs = require('fs');

function sanitize(filename) {
  const content = fs.readFileSync(filename, 'utf8');
  const lines = content.split('\n');
  const filtered = lines.filter(line => !line.startsWith('INSERT INTO public._prisma_migrations'));
  fs.writeFileSync(filename, filtered.join('\n'), 'utf8');
  console.log(`Sanitized ${filename}`);
}

sanitize('db1_data.sql');
