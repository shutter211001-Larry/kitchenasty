import { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.js';
import Header from './Header.js';
import Footer from './Footer.js';
import CartDrawer from './CartDrawer.js';
import CookieBanner from './CookieBanner.js';
import GroupOrderDialog from './GroupOrderDialog.js';

export default function Layout() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { tableName, setTableName } = useCart();

  // 1. 如果網址上有 ?table，就寫入 Context (僅當兩者不同時，避免無限迴圈)
  useEffect(() => {
    const tableParam = searchParams.get('table');
    if (tableParam && tableParam !== tableName) {
      setTableName(tableParam);
    }
  }, [searchParams, tableName, setTableName]);

  // 2. 如果 Context 中有 tableName，但網址上沒有，則補上 (確保永遠導回帶桌號的網址)
  useEffect(() => {
    if (tableName) {
      const tableParam = searchParams.get('table');
      if (tableParam !== tableName) {
        const newParams = new URLSearchParams(searchParams);
        newParams.set('table', tableName);
        setSearchParams(newParams, { replace: true });
      }
    }
  }, [tableName, searchParams, setSearchParams]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-950 dark:text-gray-100">
      <Header />
      <main className="flex-1">
        <Outlet />
      </main>
      <Footer />
      <CartDrawer />
      <CookieBanner />
      <GroupOrderDialog />
    </div>
  );
}
