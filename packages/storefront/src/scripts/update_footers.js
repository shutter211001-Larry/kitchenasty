import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const footersDir = path.join(__dirname, '..', 'templates', 'footers');
const files = fs.readdirSync(footersDir).filter(f => f.endsWith('Footer.tsx'));

for (const file of files) {
  const filePath = path.join(footersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Add useAuth import if missing
  if (!content.includes('useAuth')) {
    content = content.replace(
      "import { useTheme } from '../../context/ThemeContext.js';",
      "import { useTheme } from '../../context/ThemeContext.js';\nimport { useAuth } from '../../context/AuthContext.js';"
    );
  }

  // Add useAuth destructuring
  if (!content.includes('const { user')) {
    content = content.replace(
      "const { settings } = useTheme();",
      "const { settings } = useTheme();\n  const { user, isLoading } = useAuth();"
    );
  }

  // Update reservations logic
  content = content.replace(
    /settings\.navShowReservations &&(?! settings\.reservationSettings\?\.enabled)/g,
    "settings.navShowReservations && settings.reservationSettings?.enabled &&"
  );

  // Replace membership logic
  const accountBlockRegex = /<ul className="space-y-2[^>]*>\s*<li><Link to="\/login"[^>]*>.*?<\/Link><\/li>\s*<li><Link to="\/register"[^>]*>.*?<\/Link><\/li>\s*<li><Link to="\/account"[^>]*>.*?<\/Link><\/li>\s*<\/ul>/s;

  const match = content.match(/<ul className="space-y-2[^>]*>/);
  if (match) {
    const ulStart = match[0];
    const itemClassMatch = content.match(/<li><Link to="\/login" className="([^"]+)"/);
    const itemClass = itemClassMatch ? itemClassMatch[1] : '';

    const newAccountBlock = `${ulStart}
                {isLoading ? (
                  <li className="text-gray-500 italic">{t('common.loading')}</li>
                ) : user ? (
                  <li><Link to="/account" className="${itemClass}">{t('nav.myAccountWithName', { name: user.name })}</Link></li>
                ) : (
                  <>
                    <li><Link to="/login" className="${itemClass}">{t('nav.login')}</Link></li>
                    <li><Link to="/register" className="${itemClass}">{t('footer.createAccount')}</Link></li>
                  </>
                )}
              </ul>`;

    content = content.replace(accountBlockRegex, newAccountBlock);
  }

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}
