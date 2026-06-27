import fs from 'fs';
const file = 'packages/server/src/controllers/auth.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const target = \  const { email, password } = parsed.data;
  console.log(\\\[AUTH DEBUG] Attempting login for email: "\\\"\\\);\;

const replacement = \  const { email, password } = parsed.data;
  console.log(\\\[AUTH DEBUG] Attempting login for email: "\\\"\\\);

  // Auto-seed default administrator if the user table is empty
  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('Seeding default administrator admin@shutter.com / admin123...');
    const adminHash = await bcrypt.hash('admin123', 10);
    await prisma.user.create({
      data: {
        email: 'admin@shutter.com',
        name: '系統管理員',
        password: adminHash,
        role: 'SUPER_ADMIN'
      }
    });
  }\;

code = code.replace(target, replacement);
fs.writeFileSync(file, code);
