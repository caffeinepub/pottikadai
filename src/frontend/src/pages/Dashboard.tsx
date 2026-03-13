import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Loader2,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Page } from "../components/layout/AppShell";
import {
  useDailySummary,
  useProducts,
  useSaleInvoices,
} from "../hooks/useQueries";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const toDate = (t: bigint) => new Date(Number(t / BigInt(1_000_000)));

interface DashboardProps {
  onNavigate: (page: Page) => void;
}

export function Dashboard({ onNavigate }: DashboardProps) {
  const { data: summary, isLoading: loadingSummary } = useDailySummary();
  const { data: products, isLoading: loadingProducts } = useProducts();
  const { data: invoices, isLoading: loadingInvoices } = useSaleInvoices();

  const lowStockCount = useMemo(
    () =>
      products?.filter((p) => p.stockQty <= p.lowStockThreshold).length ?? 0,
    [products],
  );

  const outstandingTotal = useMemo(
    () =>
      invoices
        ?.filter((i) => i.status !== "paid")
        .reduce((s, i) => s + (i.total - i.paidAmount), 0) ?? 0,
    [invoices],
  );

  const recentInvoices = useMemo(
    () =>
      [...(invoices ?? [])].sort((a, b) => Number(b.date - a.date)).slice(0, 5),
    [invoices],
  );

  // Build last 7 days chart data
  const chartData = useMemo(() => {
    const days: Record<string, number> = {};
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toLocaleDateString("en-IN", { weekday: "short" });
      days[key] = 0;
    }
    for (const inv of invoices ?? []) {
      const d = toDate(inv.date);
      const diff = Math.floor((today.getTime() - d.getTime()) / 86400000);
      if (diff >= 0 && diff < 7) {
        const key = d.toLocaleDateString("en-IN", { weekday: "short" });
        days[key] = (days[key] || 0) + inv.total;
      }
    }
    return Object.entries(days).map(([day, sales]) => ({ day, sales }));
  }, [invoices]);

  const kpis = [
    {
      title: "Today's Revenue",
      value: loadingSummary ? null : fmt(summary?.totalSales ?? 0),
      icon: TrendingUp,
      color: "text-primary",
      bg: "bg-primary/10",
      sub: `${summary?.invoiceCount ?? 0} invoices`,
    },
    {
      title: "Total Sales (Invoices)",
      value: loadingInvoices ? null : String(invoices?.length ?? 0),
      icon: Receipt,
      color: "text-amber-accent",
      bg: "bg-accent/10",
      sub: fmt(invoices?.reduce((s, i) => s + i.total, 0) ?? 0),
    },
    {
      title: "Low Stock Items",
      value: loadingProducts ? null : String(lowStockCount),
      icon: AlertTriangle,
      color: lowStockCount > 0 ? "text-destructive" : "text-success",
      bg: lowStockCount > 0 ? "bg-destructive/10" : "bg-green-500/10",
      sub: loadingProducts
        ? "loading..."
        : `${products?.length ?? 0} total products`,
    },
    {
      title: "Outstanding Receivables",
      value: loadingInvoices ? null : fmt(outstandingTotal),
      icon: TrendingDown,
      color: outstandingTotal > 0 ? "text-destructive" : "text-success",
      bg: outstandingTotal > 0 ? "bg-destructive/10" : "bg-green-500/10",
      sub: `${invoices?.filter((i) => i.status !== "paid").length ?? 0} unpaid invoices`,
    },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6" data-ocid="dashboard.page">
      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <motion.div
            key={kpi.title}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07 }}
          >
            <Card
              className="card-hover border-border"
              data-ocid={`dashboard.kpi.card.${idx + 1}`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div
                    className={cn(
                      "w-9 h-9 rounded-lg flex items-center justify-center",
                      kpi.bg,
                    )}
                  >
                    <kpi.icon className={cn("w-4.5 h-4.5", kpi.color)} />
                  </div>
                </div>
                <div className="space-y-1">
                  {kpi.value === null ? (
                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                  ) : (
                    <div className="font-display font-bold text-xl md:text-2xl">
                      {kpi.value}
                    </div>
                  )}
                  <div className="text-xs text-muted-foreground">
                    {kpi.title}
                  </div>
                  <div className="text-xs text-muted-foreground/70">
                    {kpi.sub}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        {/* Sales Trend Chart */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="lg:col-span-2"
        >
          <Card className="border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">
                Weekly Sales Trend
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop
                        offset="5%"
                        stopColor="oklch(0.70 0.16 195)"
                        stopOpacity={0.3}
                      />
                      <stop
                        offset="95%"
                        stopColor="oklch(0.70 0.16 195)"
                        stopOpacity={0}
                      />
                    </linearGradient>
                  </defs>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(var(--border))"
                  />
                  <XAxis
                    dataKey="day"
                    tick={{ fontSize: 11 }}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    stroke="oklch(var(--muted-foreground))"
                  />
                  <Tooltip
                    formatter={(v: number) => [fmt(v), "Sales"]}
                    contentStyle={{
                      background: "oklch(var(--popover))",
                      border: "1px solid oklch(var(--border))",
                      borderRadius: "8px",
                      fontSize: 12,
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="sales"
                    stroke="oklch(0.70 0.16 195)"
                    strokeWidth={2}
                    fill="url(#salesGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <Card className="border-border h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-display">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {[
                {
                  label: "New Sale",
                  icon: ShoppingCart,
                  page: "pos" as Page,
                  color: "default" as const,
                },
                {
                  label: "Add Product",
                  icon: Package,
                  page: "products" as Page,
                  color: "outline" as const,
                },
                {
                  label: "Add Party",
                  icon: Users,
                  page: "parties" as Page,
                  color: "outline" as const,
                },
                {
                  label: "New Invoice",
                  icon: Receipt,
                  page: "sales" as Page,
                  color: "outline" as const,
                },
              ].map((action, i) => (
                <Button
                  key={action.label}
                  variant={action.color}
                  className="w-full justify-start"
                  onClick={() => onNavigate(action.page)}
                  data-ocid={`dashboard.quick.button.${i + 1}`}
                >
                  <action.icon className="w-4 h-4 mr-2" />
                  {action.label}
                </Button>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Recent Transactions */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <Card className="border-border">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base font-display">
              Recent Transactions
            </CardTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onNavigate("sales")}
              data-ocid="dashboard.sales.link"
            >
              View All
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {loadingInvoices ? (
              <div
                className="flex items-center justify-center py-8"
                data-ocid="dashboard.transactions.loading_state"
              >
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              </div>
            ) : recentInvoices.length === 0 ? (
              <div
                className="text-center py-8 text-muted-foreground text-sm"
                data-ocid="dashboard.transactions.empty_state"
              >
                <Receipt className="w-8 h-8 mx-auto mb-2 opacity-30" />
                No transactions yet
              </div>
            ) : (
              <div className="divide-y divide-border">
                {recentInvoices.map((inv, i) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between px-4 py-3"
                    data-ocid={`dashboard.transaction.row.${i + 1}`}
                  >
                    <div>
                      <div className="font-medium text-sm font-mono">
                        {inv.invoiceNumber}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {toDate(inv.date).toLocaleDateString("en-IN")}
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge
                        variant={
                          inv.status === "paid"
                            ? "default"
                            : inv.status === "partial"
                              ? "outline"
                              : "destructive"
                        }
                        className="text-xs"
                      >
                        {inv.status}
                      </Badge>
                      <span className="font-semibold text-sm">
                        {fmt(inv.total)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
