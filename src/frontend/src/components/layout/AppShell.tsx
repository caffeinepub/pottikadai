import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  BarChart3,
  Bell,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Moon,
  Package,
  Printer,
  Receipt,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sun,
  User,
  Users,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { AppRole } from "../../backend.d";

type Page =
  | "dashboard"
  | "pos"
  | "products"
  | "sales"
  | "purchase"
  | "parties"
  | "accounting"
  | "expenses"
  | "invoice-designer"
  | "reports"
  | "settings";

interface UserProfileLike {
  name: string;
  appRole: AppRole;
}

interface NavItem {
  id: Page;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

const ALL_ROLES = [
  AppRole.Admin,
  AppRole.Manager,
  AppRole.Salesman,
  AppRole.Auditor,
];

const NAV_ITEMS: NavItem[] = [
  {
    id: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ALL_ROLES,
  },
  {
    id: "pos",
    label: "POS",
    icon: ShoppingCart,
    roles: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    roles: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
  },
  {
    id: "sales",
    label: "Sales",
    icon: Receipt,
    roles: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
  },
  {
    id: "purchase",
    label: "Purchase",
    icon: ShoppingBag,
    roles: [AppRole.Admin, AppRole.Manager],
  },
  {
    id: "parties",
    label: "Parties",
    icon: Users,
    roles: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
  },
  {
    id: "accounting",
    label: "Accounting",
    icon: BookOpen,
    roles: [AppRole.Admin, AppRole.Manager, AppRole.Auditor],
  },
  {
    id: "expenses",
    label: "Expenses",
    icon: CreditCard,
    roles: [AppRole.Admin, AppRole.Manager],
  },
  {
    id: "invoice-designer",
    label: "Invoice Designer",
    icon: Printer,
    roles: [AppRole.Admin, AppRole.Manager],
  },
  { id: "reports", label: "Reports", icon: BarChart3, roles: ALL_ROLES },
  { id: "settings", label: "Settings", icon: Settings, roles: [AppRole.Admin] },
];

const ROLE_LABELS: Record<AppRole, string> = {
  [AppRole.Admin]: "Admin",
  [AppRole.Manager]: "Manager",
  [AppRole.Salesman]: "Salesman",
  [AppRole.Auditor]: "Auditor",
};

const ROLE_COLORS: Record<AppRole, string> = {
  [AppRole.Admin]: "bg-destructive/20 text-destructive border-destructive/30",
  [AppRole.Manager]: "bg-primary/20 text-primary border-primary/30",
  [AppRole.Salesman]: "bg-accent/20 text-accent-foreground border-accent/30",
  [AppRole.Auditor]: "bg-muted text-muted-foreground border-border",
};

interface AppShellProps {
  children: React.ReactNode;
  currentPage: Page;
  onNavigate: (page: Page) => void;
  profile: UserProfileLike | null;
  isDark: boolean;
  onToggleTheme: () => void;
  onLogout: () => void;
}

export type { Page };

export function AppShell({
  children,
  currentPage,
  onNavigate,
  profile,
  isDark,
  onToggleTheme,
  onLogout,
}: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  const role = profile?.appRole ?? AppRole.Salesman;
  const visibleItems = NAV_ITEMS.filter((item) => item.roles.includes(role));

  const pageTitles: Record<Page, string> = {
    dashboard: "Dashboard",
    pos: "Point of Sale",
    products: "Products & Inventory",
    sales: "Sales & Invoices",
    purchase: "Purchase Bills",
    parties: "Parties",
    accounting: "Accounting",
    expenses: "Expenses",
    "invoice-designer": "Invoice Designer",
    reports: "Reports",
    settings: "Settings",
  };

  // Close mobile sidebar on route change
  // biome-ignore lint/correctness/useExhaustiveDependencies: setMobileOpen is stable
  useEffect(() => {
    setMobileOpen(false);
  }, [currentPage]);

  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 px-4 py-5 border-b border-sidebar-border",
          collapsed && !isMobile ? "justify-center px-2" : "",
        )}
      >
        <div className="flex-shrink-0 w-9 h-9 rounded-lg bg-primary flex items-center justify-center">
          <Store className="w-5 h-5 text-primary-foreground" />
        </div>
        {(!collapsed || isMobile) && (
          <div>
            <div className="font-display font-bold text-sidebar-foreground text-lg leading-tight">
              Pottikadai
            </div>
            <div className="text-xs text-sidebar-foreground/50 font-mono">
              Business Suite
            </div>
          </div>
        )}
      </div>

      {/* Nav Items */}
      <nav className="flex-1 py-4 overflow-y-auto scrollbar-thin">
        <TooltipProvider delayDuration={0}>
          {visibleItems.map((item) => {
            const isActive = currentPage === item.id;
            const Icon = item.icon;
            const btn = (
              <button
                type="button"
                key={item.id}
                data-ocid={`nav.${item.id}.link`}
                onClick={() => onNavigate(item.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg mx-1 text-sm font-medium transition-all duration-150",
                  collapsed && !isMobile ? "justify-center mx-1" : "mx-2",
                  isActive
                    ? "bg-sidebar-primary/15 text-sidebar-primary border border-sidebar-primary/20"
                    : "text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-accent",
                )}
                style={{
                  width:
                    collapsed && !isMobile
                      ? "calc(100% - 8px)"
                      : "calc(100% - 16px)",
                }}
              >
                <Icon
                  className={cn(
                    "flex-shrink-0",
                    isActive ? "text-sidebar-primary" : "",
                    "w-4.5 h-4.5 w-[18px] h-[18px]",
                  )}
                />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
                {isActive && !collapsed && !isMobile && (
                  <span className="ml-auto w-1.5 h-1.5 rounded-full bg-sidebar-primary" />
                )}
              </button>
            );
            if (collapsed && !isMobile) {
              return (
                <Tooltip key={item.id}>
                  <TooltipTrigger asChild>{btn}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              );
            }
            return btn;
          })}
        </TooltipProvider>
      </nav>

      {/* User profile footer */}
      <div className="border-t border-sidebar-border p-3">
        <div
          className={cn(
            "flex items-center gap-2",
            collapsed && !isMobile ? "justify-center" : "",
          )}
        >
          <Avatar className="w-8 h-8 flex-shrink-0">
            <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
              {profile?.name?.charAt(0)?.toUpperCase() || "U"}
            </AvatarFallback>
          </Avatar>
          {(!collapsed || isMobile) && (
            <div className="flex-1 min-w-0">
              <div className="text-xs font-semibold text-sidebar-foreground truncate">
                {profile?.name || "User"}
              </div>
              <span
                className={cn(
                  "text-xs px-1.5 py-0.5 rounded border font-medium",
                  ROLE_COLORS[role],
                )}
              >
                {ROLE_LABELS[role]}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar */}
      <motion.aside
        animate={{ width: collapsed ? 64 : 240 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="hidden md:flex flex-col bg-sidebar border-r border-sidebar-border relative z-20 overflow-hidden"
      >
        <SidebarContent />
        <button
          type="button"
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 w-6 h-6 rounded-full bg-sidebar-border border border-sidebar-border flex items-center justify-center hover:bg-sidebar-accent transition-colors z-30"
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? (
            <ChevronRight className="w-3 h-3 text-sidebar-foreground" />
          ) : (
            <ChevronLeft className="w-3 h-3 text-sidebar-foreground" />
          )}
        </button>
      </motion.aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="md:hidden fixed inset-0 bg-black/60 z-30"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: -280 }}
              animate={{ x: 0 }}
              exit={{ x: -280 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-sidebar border-r border-sidebar-border z-40 flex flex-col"
            >
              <button
                type="button"
                className="absolute top-3 right-3 p-1.5 rounded-lg hover:bg-sidebar-accent"
                onClick={() => setMobileOpen(false)}
              >
                <X className="w-4 h-4 text-sidebar-foreground" />
              </button>
              <SidebarContent isMobile />
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border bg-card/80 glass flex-shrink-0 z-10">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="md:hidden p-1.5 rounded-lg hover:bg-muted"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <h1 className="font-display font-semibold text-lg">
              {pageTitles[currentPage]}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              data-ocid="topbar.toggle"
              onClick={onToggleTheme}
              className="w-9 h-9"
            >
              {isDark ? (
                <Sun className="w-4 h-4" />
              ) : (
                <Moon className="w-4 h-4" />
              )}
            </Button>
            <Button variant="ghost" size="icon" className="w-9 h-9 relative">
              <Bell className="w-4 h-4" />
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-destructive" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="w-9 h-9"
                  data-ocid="topbar.user.dropdown_menu"
                >
                  <Avatar className="w-7 h-7">
                    <AvatarFallback className="bg-primary/20 text-primary text-xs font-bold">
                      {profile?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-3 py-2">
                  <div className="font-semibold text-sm">
                    {profile?.name || "User"}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {profile?.appRole && ROLE_LABELS[profile.appRole]}
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem data-ocid="topbar.profile.link">
                  <User className="w-4 h-4 mr-2" /> Profile
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={onLogout}
                  data-ocid="topbar.logout.button"
                  className="text-destructive"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto scrollbar-thin">
          <motion.div
            key={currentPage}
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  );
}

export { ROLE_COLORS, ROLE_LABELS };
export type { Page as AppPage };
