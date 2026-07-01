import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Utensils,
  Users,
  Package,
  Settings,
  Printer,
  LogOut,
  Archive,
  Briefcase,
  Workflow,
  Menu,
  X,
  DollarSign,
} from "lucide-react";
import { cn } from "../lib/utils";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "react-i18next";
const SidebarItem = ({
  icon: Icon,
  label,
  path,
  onClick,
}: {
  icon: any;
  label: string;
  path: string;
  onClick?: () => void;
}) => {
  const location = useLocation();
  const active = location.pathname === path;
  return (
    <Link
      to={path}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all duration-200",
        active
          ? "bg-primary text-white shadow-lg shadow-primary/30"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      <Icon className="w-5 h-5" />
      <span className="font-medium">{label}</span>
    </Link>
  );
};
const Layout = ({ children }: { children: React.ReactNode }) => {
  const { t } = useTranslation();
  const { user, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const closeMobileMenu = () => setIsMobileMenuOpen(false);
  return (
    <div className="min-h-screen bg-[#F8F9FA] flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <header className="md:hidden sticky top-0 z-40 bg-white border-b border-border px-4 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-1.5 hover:bg-muted rounded-xl transition-all border border-border/80"
            aria-label={t("erp_182")}
          >
            <Menu className="w-5 h-5 text-gray-700" />
          </button>
          <div className="flex items-center gap-1.5">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center shadow-md shadow-primary/20">
              <Utensils className="text-white w-4.5 h-4.5" />
            </div>
            <h1 className="text-sm font-black tracking-tight text-gray-800">
              {t("erp_183")}
            </h1>
          </div>
        </div>

        {user && (
          <div className="w-8 h-8 bg-gradient-to-tr from-primary to-orange-500 rounded-lg flex items-center justify-center shadow-sm text-white font-black text-xs">
            {user.name ? user.name[0].toUpperCase() : "U"}
          </div>
        )}
      </header>

      {/* Mobile Menu Backdrop Mask */}
      {isMobileMenuOpen && (
        <div
          onClick={closeMobileMenu}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden animate-in fade-in duration-200"
        />
      )}

      {/* Mobile Drawer Navigation */}
      <aside
        className={cn(
          "fixed top-0 bottom-0 left-0 z-50 w-72 bg-white p-6 flex flex-col gap-6 shadow-2xl transition-transform duration-300 md:hidden",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 bg-primary rounded-xl flex items-center justify-center shadow-md shadow-primary/20">
              <Utensils className="text-white w-5 h-5" />
            </div>
            <h2 className="text-base font-bold tracking-tight text-gray-800">
              {t("erp_183")}
            </h2>
          </div>
          <button
            onClick={closeMobileMenu}
            className="p-1.5 hover:bg-muted border border-border/60 rounded-lg transition-all"
          >
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* User Card */}
        {user && (
          <div className="bg-muted/40 border border-border/40 p-4 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-orange-500 rounded-xl flex items-center justify-center shadow-sm text-white font-black text-sm shrink-0">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-gray-800 truncate">
                {user.name || t("erp_184")}
              </h4>
              <span className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded uppercase mt-0.5">
                {user.role === "ADMIN" ? t("erp_185") : t("erp_186")}
              </span>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1.5 overflow-y-auto">
          <SidebarItem
            icon={LayoutDashboard}
            label={t("erp_187")}
            path="/"
            onClick={closeMobileMenu}
          />
          <SidebarItem
            icon={Package}
            label={t("erp_188")}
            path="/ingredients"
            onClick={closeMobileMenu}
          />
          <SidebarItem
            icon={Archive}
            label={t("erp_189")}
            path="/inventory"
            onClick={closeMobileMenu}
          />
          <SidebarItem
            icon={DollarSign}
            label="帳務管理"
            path="/expenses"
            onClick={closeMobileMenu}
          />
          <SidebarItem
            icon={Utensils}
            label={t("erp_190")}
            path="/recipes"
            onClick={closeMobileMenu}
          />
          <SidebarItem
            icon={Briefcase}
            label={t("erp_191")}
            path="/suppliers"
            onClick={closeMobileMenu}
          />
          <SidebarItem
            icon={Workflow}
            label={t("erp_192")}
            path="/integration"
            onClick={closeMobileMenu}
          />
          <SidebarItem
            icon={Printer}
            label={t("erp_193")}
            path="/labels"
            onClick={closeMobileMenu}
          />
          {user?.role === "ADMIN" && (
            <>
              <SidebarItem
                icon={Users}
                label={t("erp_194")}
                path="/users"
                onClick={closeMobileMenu}
              />
              <SidebarItem
                icon={Settings}
                label={t("erp_195")}
                path="/settings"
                onClick={closeMobileMenu}
              />
            </>
          )}
        </nav>

        <div className="mt-auto space-y-4">
          <button
            onClick={() => {
              closeMobileMenu();
              logout();
            }}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white text-red-600 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("erp_196")}</span>
          </button>
        </div>
      </aside>

      {/* Desktop Sidebar */}
      <aside className="w-64 bg-white border-r border-border p-6 hidden md:flex md:flex-col gap-6 sticky top-0 h-screen shrink-0">
        <div className="flex items-center gap-2 px-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center shadow-lg shadow-primary/20">
            <Utensils className="text-white w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">{t("erp_183")}</h1>
        </div>

        {/* User Profile Card */}
        {user && (
          <div className="bg-muted/30 border border-border/40 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in duration-300">
            <div className="w-10 h-10 bg-gradient-to-tr from-primary to-orange-500 rounded-xl flex items-center justify-center shadow-sm text-white font-black text-sm shrink-0">
              {user.name ? user.name[0].toUpperCase() : "U"}
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="text-xs font-black text-gray-800 truncate">
                {user.name || t("erp_184")}
              </h4>
              <span className="inline-block px-1.5 py-0.5 bg-primary/10 text-primary text-[8px] font-black rounded uppercase mt-0.5">
                {user.role === "ADMIN" ? t("erp_185") : t("erp_186")}
              </span>
            </div>
          </div>
        )}

        <nav className="flex flex-col gap-1.5 overflow-y-auto">
          <SidebarItem icon={LayoutDashboard} label={t("erp_187")} path="/" />
          <SidebarItem
            icon={Package}
            label={t("erp_188")}
            path="/ingredients"
          />
          <SidebarItem icon={Archive} label={t("erp_189")} path="/inventory" />
          <SidebarItem icon={DollarSign} label="帳務管理" path="/expenses" />
          <SidebarItem icon={Utensils} label={t("erp_190")} path="/recipes" />
          <SidebarItem
            icon={Briefcase}
            label={t("erp_191")}
            path="/suppliers"
          />
          <SidebarItem
            icon={Workflow}
            label={t("erp_192")}
            path="/integration"
          />
          <SidebarItem icon={Printer} label={t("erp_193")} path="/labels" />
          {user?.role === "ADMIN" && (
            <>
              <SidebarItem icon={Users} label={t("erp_194")} path="/users" />
              <SidebarItem
                icon={Settings}
                label={t("erp_195")}
                path="/settings"
              />
            </>
          )}
        </nav>

        <div className="mt-auto space-y-4">
          <button
            onClick={logout}
            className="w-full flex items-center justify-center gap-2 py-3 bg-red-50 border border-red-100 hover:bg-red-500 hover:text-white text-red-600 text-xs font-black rounded-xl transition-all cursor-pointer shadow-sm active:scale-95"
          >
            <LogOut className="w-4 h-4" />
            <span>{t("erp_196")}</span>
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto min-w-0">
        <div className="max-w-7xl mx-auto">{children}</div>
      </main>
    </div>
  );
};
export default Layout;
