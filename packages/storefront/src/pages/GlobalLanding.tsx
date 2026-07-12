import { Mail, ArrowRight, Building2, Store, Laptop } from 'lucide-react';
// import { env } from '../lib/env.js'; // Use meta env directly

export default function GlobalLanding() {
  const adminUrl = import.meta.env.VITE_ADMIN_URL || '/'; 

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white relative overflow-hidden font-sans">
      {/* Background Mesh/Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/30 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-orange-600/20 blur-[120px] rounded-full pointer-events-none" />

      {/* Navbar */}
      <nav className="relative z-10 max-w-7xl mx-auto px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 flex items-center justify-center font-bold text-lg shadow-lg">
            S
          </div>
          <span className="font-bold tracking-tight text-xl">Shutter</span>
        </div>
        <div>
          <a
            href="mailto:shutter211001@gmail.com"
            className="flex items-center gap-2 text-sm font-medium text-gray-300 hover:text-white transition-colors"
          >
            <Mail size={16} />
            <span className="hidden sm:inline">聯絡我們</span>
          </a>
        </div>
      </nav>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col items-center text-center">
        
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-orange-400 text-xs font-semibold uppercase tracking-wider mb-8 animate-fade-in-up">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-orange-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-orange-500"></span>
          </span>
          SaaS 雲端餐飲管理平台
        </div>

        <h1 className="text-5xl md:text-7xl font-black tracking-tight leading-tight mb-6 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
          探索頂級<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 via-orange-500 to-indigo-500">
            餐飲體驗與管理
          </span>
        </h1>
        
        <p className="max-w-2xl text-lg text-gray-400 mb-12 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
          歡迎來到 Shutter。如果您是消費者，請透過專屬餐廳網址進行點餐；<br className="hidden md:block" />
          如果您是合作夥伴或餐廳老闆，請登入您的專屬管理後台。
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-4 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
          <a
            href={adminUrl}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white text-black rounded-full font-bold hover:bg-gray-100 hover:scale-105 transition-all duration-200"
          >
            餐廳管理員登入
            <ArrowRight size={18} />
          </a>
          <a
            href="mailto:shutter211001@gmail.com"
            className="flex items-center justify-center gap-2 px-8 py-4 bg-white/5 backdrop-blur-md border border-white/10 rounded-full font-bold text-white hover:bg-white/10 transition-all duration-200"
          >
            <Mail size={18} />
            聯絡業務團隊
          </a>
        </div>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-32 w-full animate-fade-in-up" style={{ animationDelay: '400ms' }}>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-left hover:bg-white/10 transition-colors">
            <Store className="w-8 h-8 text-orange-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">專屬品牌官網</h3>
            <p className="text-sm text-gray-400">為每間餐廳打造無縫的點餐與預訂體驗，輕鬆提升品牌形象。</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-left hover:bg-white/10 transition-colors">
            <Laptop className="w-8 h-8 text-indigo-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">強大雲端 POS</h3>
            <p className="text-sm text-gray-400">整合內用、外帶與外送，並具備即時庫存與員工管理系統。</p>
          </div>
          <div className="bg-white/5 backdrop-blur-md border border-white/10 p-6 rounded-2xl text-left hover:bg-white/10 transition-colors">
            <Building2 className="w-8 h-8 text-emerald-400 mb-4" />
            <h3 className="text-lg font-bold mb-2">多門店與連鎖管理</h3>
            <p className="text-sm text-gray-400">專為擴張設計，輕鬆同步多間分店的菜單與營收報表。</p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/10 mt-auto">
        <div className="max-w-7xl mx-auto px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-gray-500">
          <p>© {new Date().getFullYear()} Shutter SaaS Platform. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <a href="mailto:shutter211001@gmail.com" className="hover:text-gray-300 transition-colors">
              shutter211001@gmail.com
            </a>
          </div>
        </div>
      </footer>

      {/* Custom Styles for Keyframes */}
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in-up {
          opacity: 0;
          animation: fadeInUp 0.8s ease-out forwards;
        }
      `}</style>
    </div>
  );
}
