import { Toaster } from "@/components/ui/sonner";
import { Loader2 } from "lucide-react";
import { ThemeProvider, useTheme } from "next-themes";
import { useEffect, useState } from "react";
import { AppRole } from "./backend.d";
import { AppShell } from "./components/layout/AppShell";
import type { Page } from "./components/layout/AppShell";
import { useInternetIdentity } from "./hooks/useInternetIdentity";
import { useCallerProfile } from "./hooks/useQueries";
import { Accounting } from "./pages/Accounting";
import { Dashboard } from "./pages/Dashboard";
import { Expenses } from "./pages/Expenses";
import { InvoiceDesigner } from "./pages/InvoiceDesigner";
import { Login } from "./pages/Login";
import { POS } from "./pages/POS";
import { Parties } from "./pages/Parties";
import { Products } from "./pages/Products";
import { Purchase } from "./pages/Purchase";
import { Reports } from "./pages/Reports";
import { Sales } from "./pages/Sales";
import { Settings } from "./pages/Settings";

function AppContent() {
  const { resolvedTheme, setTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  const { identity, isInitializing, clear } = useInternetIdentity();
  const { data: profile, isLoading: profileLoading } = useCallerProfile();

  const [currentPage, setCurrentPage] = useState<Page>("dashboard");

  // Restore page from hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "");
    const validPages: Page[] = [
      "dashboard",
      "pos",
      "products",
      "sales",
      "purchase",
      "parties",
      "accounting",
      "expenses",
      "invoice-designer",
      "reports",
      "settings",
    ];
    if (validPages.includes(hash as Page)) {
      setCurrentPage(hash as Page);
    }
    const handler = () => {
      const h = window.location.hash.replace("#", "");
      if (validPages.includes(h as Page)) {
        setCurrentPage(h as Page);
      }
    };
    window.addEventListener("hashchange", handler);
    return () => window.removeEventListener("hashchange", handler);
  }, []);

  const navigate = (page: Page) => {
    setCurrentPage(page);
    window.location.hash = page;
  };

  const handleLogout = () => {
    clear();
    setCurrentPage("dashboard");
    window.location.hash = "";
  };

  const toggleTheme = () => setTheme(isDark ? "light" : "dark");

  // Loading state
  if (isInitializing || profileLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">Loading Pottikadai...</p>
        </div>
      </div>
    );
  }

  // Not logged in or no profile: show login
  if (!identity || !profile) {
    return <Login isDark={isDark} onToggleTheme={toggleTheme} />;
  }

  // Role-based page guard
  const role = profile.appRole;
  const roleGuard = (): Page => {
    const restricted: Record<Page, AppRole[]> = {
      dashboard: [
        AppRole.Admin,
        AppRole.Manager,
        AppRole.Salesman,
        AppRole.Auditor,
      ],
      pos: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
      products: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
      sales: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
      purchase: [AppRole.Admin, AppRole.Manager],
      parties: [AppRole.Admin, AppRole.Manager, AppRole.Salesman],
      accounting: [AppRole.Admin, AppRole.Manager, AppRole.Auditor],
      expenses: [AppRole.Admin, AppRole.Manager],
      "invoice-designer": [AppRole.Admin, AppRole.Manager],
      reports: [
        AppRole.Admin,
        AppRole.Manager,
        AppRole.Salesman,
        AppRole.Auditor,
      ],
      settings: [AppRole.Admin],
    };
    if (restricted[currentPage]?.includes(role)) return currentPage;
    return "dashboard";
  };
  const safePage = roleGuard();

  const pageComponents: Record<Page, React.ReactNode> = {
    dashboard: <Dashboard onNavigate={navigate} />,
    pos: <POS />,
    products: <Products />,
    sales: <Sales />,
    purchase: <Purchase />,
    parties: <Parties />,
    accounting: <Accounting />,
    expenses: <Expenses />,
    "invoice-designer": <InvoiceDesigner />,
    reports: <Reports />,
    settings: <Settings />,
  };

  return (
    <AppShell
      currentPage={safePage}
      onNavigate={navigate}
      profile={profile}
      isDark={isDark}
      onToggleTheme={toggleTheme}
      onLogout={handleLogout}
    >
      {pageComponents[safePage]}
    </AppShell>
  );
}

export default function App() {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="dark"
      enableSystem={false}
      storageKey="pottikadai-theme"
    >
      <AppContent />
      <Toaster richColors position="top-right" />
    </ThemeProvider>
  );
}
