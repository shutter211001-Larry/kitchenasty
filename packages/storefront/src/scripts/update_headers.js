import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const headersDir = path.join(__dirname, '..', 'templates', 'headers');
const files = fs.readdirSync(headersDir).filter(f => f.endsWith('Header.tsx'));

for (const file of files) {
  const filePath = path.join(headersDir, file);
  let content = fs.readFileSync(filePath, 'utf8');

  // Handle ElegantHeader which doesn't use useHeaderProps
  if (file === 'ElegantHeader.tsx') {
    if (!content.includes('useRecentOrders')) {
      content = content.replace(
        "import LanguageSwitcher",
        "import { useRecentOrders } from '../../hooks/useRecentOrders.js';\nimport LanguageSwitcher"
      );
      content = content.replace(
        "const { user, logout } = useAuth();",
        "const { user, logout, isLoading } = useAuth();\n  const { recentOrders } = useRecentOrders();"
      );
    }
  } else {
    // Add useRecentOrders to useHeaderProps.ts later
    // Add isLoading and recentOrders to the destructured props
    const destructureMatch = content.match(/const\s*{\s*([^}]+)\s*}\s*=\s*useHeaderProps\(\);/);
    if (destructureMatch) {
      let props = destructureMatch[1];
      if (!props.includes('isLoading')) props += ', isLoading';
      if (!props.includes('recentOrders')) props += ', recentOrders';
      content = content.replace(destructureMatch[0], `const { ${props} } = useHeaderProps();`);
    }
  }

  // Inject desktop track order link before <LanguageSwitcher />
  if (!content.includes('recentOrders.length > 0')) {
    const desktopTrackMatch = content.match(/<LanguageSwitcher \/>/);
    if (desktopTrackMatch) {
      content = content.replace(
        desktopTrackMatch[0],
        `{!user && recentOrders.length > 0 && (
              <Link
                to={\`/orders/\${recentOrders[0].id}\`}
                className="p-2 text-primary-500 hover:text-primary-600 rounded-md flex items-center gap-1"
                title={t('nav.trackOrder')}
              >
                <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span className="text-xs font-bold hidden lg:inline">{t('nav.trackOrder')}</span>
              </Link>
            )}
            <LanguageSwitcher />`
      );
    }
  }

  // Inject mobile track order link after navLinks.map
  const mobileNavLinksRegex = /\{navLinks\.map\(\(link\) => \([\s\S]*?<\/Link>\s*\)\s*\}/;
  if (!content.includes('trackRecentOrder')) {
    const mobileMatch = content.match(mobileNavLinksRegex);
    if (mobileMatch) {
      content = content.replace(
        mobileMatch[0],
        `${mobileMatch[0]}
            {!user && recentOrders.length > 0 && (
              <div className="px-3 py-2 border-t border-gray-800 mt-2">
                <Link
                  to={\`/orders/\${recentOrders[0].id}\`}
                  onClick={() => setMobileOpen(false)}
                  className="flex items-center gap-2 text-primary-500 font-bold py-2"
                >
                  <svg className="w-5 h-5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  {t('nav.trackRecentOrder')}
                </Link>
              </div>
            )}`
      );
    }
  }

  // Update isLoading logic for membership (desktop + mobile)
  // This is tricky because it's ternary.
  // user ? ( ... ) : ( ... )
  // Replace with isLoading ? ( <div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" /> ) : user ?
  const userCheckRegex = /\{\s*user \? \(/g;
  content = content.replace(userCheckRegex, `{isLoading ? (<div className="w-5 h-5 border-2 border-primary-500 border-t-transparent rounded-full animate-spin mx-3" />) : user ? (`);

  fs.writeFileSync(filePath, content, 'utf8');
  console.log(`Updated ${file}`);
}

// Update useHeaderProps.ts
const hookPath = path.join(headersDir, 'useHeaderProps.ts');
let hookContent = fs.readFileSync(hookPath, 'utf8');
if (!hookContent.includes('useRecentOrders')) {
  hookContent = hookContent.replace(
    "import { useTheme }",
    "import { useTheme } from '../../context/ThemeContext.js';\nimport { useRecentOrders } from '../../hooks/useRecentOrders.js';\n//"
  );
  hookContent = hookContent.replace(
    "const { settings } = useTheme();",
    "const { settings } = useTheme();\n  const { recentOrders } = useRecentOrders();"
  );
  hookContent = hookContent.replace(
    "return { t, user, logout, isLoading, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen, headerRef };",
    "return { t, user, logout, isLoading, itemCount, openCart, settings, navLinks, isActive, mobileOpen, setMobileOpen, headerRef, recentOrders };"
  );
  fs.writeFileSync(hookPath, hookContent, 'utf8');
  console.log('Updated useHeaderProps.ts');
}
