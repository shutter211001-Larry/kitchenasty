import fs from 'fs';
let file = 'packages/server/src/controllers/auth.controller.ts';
let code = fs.readFileSync(file, 'utf8');

const target = 'export async function staffLogin(';
const replacement = \export async function getSetupStatus(req: Request, res: Response): Promise<void> {
  try {
    const adminCount = await prisma.user.count({ where: { role: 'SUPER_ADMIN' } });
    res.json({ hasSuperAdmin: adminCount > 0 });
  } catch (err) {
    res.status(500).json({ error: '獲取系統初始化狀態失敗' });
  }
}

export async function staffLogin(\;

if (!code.includes('export async function getSetupStatus')) {
  code = code.replace(target, replacement);
  fs.writeFileSync(file, code);
}

file = 'packages/server/src/routes/auth.routes.ts';
code = fs.readFileSync(file, 'utf8');

const target2 = "router.post('/staff/login', authController.staffLogin);";
const replacement2 = "router.get('/staff/setup-status', authController.getSetupStatus);\nrouter.post('/staff/login', authController.staffLogin);";

if (!code.includes('/staff/setup-status')) {
  code = code.replace(target2, replacement2);
  fs.writeFileSync(file, code);
}
