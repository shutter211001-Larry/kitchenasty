import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

interface SettingsCard {
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  roles: ('SUPER_ADMIN' | 'MANAGER')[];
}

interface SettingsGroup {
  categoryName: string;
  description: string;
  cards: SettingsCard[];
}

const groups: SettingsGroup[] = [
  {
    categoryName: '🏢 核心營運與總部管理',
    description: '管理品牌基本資訊、加盟分店合約營運與系統進階參數',
    cards: [
      {
        title: '一般設定',
        description: '餐廳名稱、時區、貨幣、聯絡資訊',
        link: '/settings/general',
        roles: ['SUPER_ADMIN', 'MANAGER'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        ),
      },
      {
        title: '總部與分店管理',
        description: '管理加盟店合約、API連線診斷、預估原料預警監控',
        link: '/settings/franchise',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.015a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72M6.75 18h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .414.336.75.75.75z" />
          </svg>
        ),
      },
      {
        title: '進階設定',
        description: '維護模式與系統速率限制設定',
        link: '/settings/advanced',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L12 4.37m-5.68 5.7h15.08M4.26 19.72l15.48-15.48" />
          </svg>
        ),
      },
    ]
  },
  {
    categoryName: '🍽️ 顧客服務與點餐控制',
    description: '配置點餐模式、外送設定、預約規則與顧客回饋審核機制',
    cards: [
      {
        title: '訂單與外送',
        description: '起送金額、準備時間、小費與稅率設定',
        link: '/settings/order',
        roles: ['SUPER_ADMIN', 'MANAGER'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5V6a3.75 3.75 0 10-7.5 0v4.5m11.356-1.993l1.263 12c.07.665-.45 1.243-1.119 1.243H4.25a1.125 1.125 0 01-1.12-1.243l1.264-12A1.125 1.125 0 015.513 7.5h12.974c.576 0 1.059.435 1.119 1.007zM8.625 10.5a.375.375 0 11-.75 0 .375.375 0 01.75 0zm7.5 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
          </svg>
        ),
      },
      {
        title: '訂位服務',
        description: '預約間隔、用餐時間、自動確認設定',
        link: '/settings/reservation',
        roles: ['SUPER_ADMIN', 'MANAGER'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
          </svg>
        ),
      },
      {
        title: '顧客評價',
        description: '審核機制、自動核准與評價門檻設定',
        link: '/settings/review',
        roles: ['SUPER_ADMIN', 'MANAGER'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z" />
          </svg>
        ),
      },
    ]
  },
  {
    categoryName: '🔔 支付金流與訊息通訊',
    description: '配置線上結帳管道與多渠道自動化顧客推播工具',
    cards: [
      {
        title: '支付方式',
        description: 'Stripe, PayPal 與現金支付配置',
        link: '/settings/payment',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />
          </svg>
        ),
      },
      {
        title: '電子發票',
        description: '設定綠界 ECPay 電子發票金鑰與開立規則',
        link: '/settings/invoice',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        ),
      },
      {
        title: '通知發送',
        description: '電子郵件與 LINE 的自動通知觸發時機與訊息設定',
        link: '/settings/notifications',
        roles: ['SUPER_ADMIN', 'MANAGER'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
          </svg>
        ),
      },
      {
        title: 'LINE 整合',
        description: '設定 LINE 官方帳號、Webhook 與會員綁定',
        link: '/settings/line',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25-9 3.694-9 8.25c0 2.336 1.054 4.436 2.743 5.922-.163.6-.59 2.164-.675 2.476-.11.403.116.377.243.292.12-.08.6-.39 1.144-.757.173.11.353.212.54.306 1.554.78 3.328 1.21 5.005 1.21z" />
          </svg>
        ),
      },
      {
        title: 'Google 整合',
        description: '設定 Gemini AI, SSO 第三方登入, Gmail API, Google Maps',
        link: '/settings/google',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
          </svg>
        ),
      },
      {
        title: '郵件設定',
        description: 'SMTP 伺服器與發件者資訊配置',
        link: '/settings/mail',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        ),
      },
    ]
  },
  {
    categoryName: '🛡️ 安全合規與權限控制',
    description: '管理帳號授權、精密微調店長與店員細項操作權限',
    cards: [
      {
        title: '角色權限',
        description: '微調店長與店員的細項操作權限',
        link: '/settings/permissions',
        roles: ['SUPER_ADMIN'],
        icon: (
          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.744c0 5.548 4.075 10.14 9 10.856a11.99 11.99 0 009-10.856c0-1.312-.21-2.574-.598-3.751A11.959 11.959 0 0112 2.714z" />
          </svg>
        ),
      },
    ]
  }
];

export default function Settings() {
  const { user } = useAuth();

  return (
    <div className="space-y-10 max-w-6xl mx-auto px-4 py-2">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">系統設定中心</h1>
        <p className="text-xs text-gray-500 font-semibold mt-1">管理品牌基本營運、顧客服務流程與多渠道通訊對接設定。</p>
      </div>

      <div className="space-y-12">
        {groups.map((group) => {
          const visibleCards = group.cards.filter(
            (card) => user && card.roles.includes(user.role as 'SUPER_ADMIN' | 'MANAGER')
          );

          if (visibleCards.length === 0) return null;

          return (
            <section key={group.categoryName} className="space-y-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <div className="border-b border-gray-150 pb-2">
                <h2 className="text-base font-black text-gray-800 tracking-tight flex items-center gap-2">
                  {group.categoryName}
                </h2>
                <p className="text-[11px] text-gray-400 font-semibold mt-0.5">{group.description}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {visibleCards.map((card) => (
                  <Link
                    key={card.link}
                    to={card.link}
                    className="bg-white rounded-2xl border border-gray-200 p-6 hover:shadow-md hover:border-primary-300 hover:scale-[1.01] transition-all duration-200 group relative overflow-hidden flex flex-col justify-between min-h-[140px]"
                  >
                    <div>
                      <div className="text-gray-400 group-hover:text-primary-500 transition-colors mb-3">
                        {card.icon}
                      </div>
                      <h3 className="text-sm font-bold text-gray-900 mb-1 tracking-tight">{card.title}</h3>
                      <p className="text-xs text-gray-500 font-medium leading-relaxed">{card.description}</p>
                    </div>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
