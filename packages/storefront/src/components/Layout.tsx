import { useEffect } from 'react';
import { Outlet, useSearchParams } from 'react-router-dom';
import { useCart } from '../context/CartContext.js';
import Header from './Header.js';
import Footer from './Footer.js';
import CartDrawer from './CartDrawer.js';
import CookieBanner from './CookieBanner.js';
import GroupOrderDialog from './GroupOrderDialog.js';

export default function Layout() {
  const [searchParams] = useSearchParams();
  const { setTableName } = useCart();

  useEffect(() => {
    const table = searchParams.get('table');
    if (table) {
      setTableName(table);
    }
  }, [searchParams, setTableName]);

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
