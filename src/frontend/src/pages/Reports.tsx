import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, Loader2 } from "lucide-react";
import { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  useExpenseSummary,
  useInventoryReport,
  useProfitLoss,
  useSaleInvoices,
  useSalesSummary,
} from "../hooks/useQueries";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const PIE_COLORS = [
  "oklch(0.70 0.16 195)",
  "oklch(0.78 0.17 55)",
  "oklch(0.65 0.20 145)",
  "oklch(0.70 0.18 310)",
  "oklch(0.65 0.22 25)",
  "oklch(0.72 0.15 230)",
];

export function Reports() {
  const now = new Date();
  const firstOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const [startDate, setStartDate] = useState(
    firstOfMonth.toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(now.toISOString().split("T")[0]);

  const start = new Date(startDate);
  const end = new Date(endDate);

  const { data: salesSummary, isLoading: loadingSales } = useSalesSummary(
    start,
    end,
  );
  const { data: pl, isLoading: loadingPl } = useProfitLoss(start, end);
  const { data: inventory, isLoading: loadingInv } = useInventoryReport();
  const { data: expSummary, isLoading: loadingExp } = useExpenseSummary(
    start,
    end,
  );
  const { data: invoices } = useSaleInvoices();

  // Build daily sales chart
  const dailyData = (() => {
    const days: Record<string, number> = {};
    for (const inv of invoices ?? []) {
      const d = new Date(Number(inv.date / BigInt(1_000_000)));
      if (d >= start && d <= end) {
        const key = d.toLocaleDateString("en-IN", {
          month: "short",
          day: "numeric",
        });
        days[key] = (days[key] || 0) + inv.total;
      }
    }
    return Object.entries(days)
      .map(([day, sales]) => ({ day, sales }))
      .slice(-14);
  })();

  const DateRange = () => (
    <div className="flex flex-wrap gap-3 mb-4">
      <div className="space-y-1">
        <Label className="text-xs">From</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-36 h-8 text-sm"
          data-ocid="reports.startdate.input"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">To</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-36 h-8 text-sm"
          data-ocid="reports.enddate.input"
        />
      </div>
    </div>
  );

  return (
    <div className="p-4 md:p-6" data-ocid="reports.page">
      <Tabs defaultValue="sales">
        <TabsList className="mb-4">
          <TabsTrigger value="sales" data-ocid="reports.sales.tab">
            Sales
          </TabsTrigger>
          <TabsTrigger value="inventory" data-ocid="reports.inventory.tab">
            Inventory
          </TabsTrigger>
          <TabsTrigger value="pl" data-ocid="reports.pl.tab">
            P&amp;L
          </TabsTrigger>
          <TabsTrigger value="expenses" data-ocid="reports.expenses.tab">
            Expenses
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sales">
          <DateRange />
          {loadingSales ? (
            <div
              className="flex justify-center py-16"
              data-ocid="reports.sales.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-4">
                <Card className="border-border">
                  <CardContent className="p-5">
                    <div className="text-2xl font-display font-bold text-primary">
                      {fmt(salesSummary?.totalSales ?? 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Revenue
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-5">
                    <div className="text-2xl font-display font-bold">
                      {String(salesSummary?.invoiceCount ?? 0)}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Invoices
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-5">
                    <div className="text-2xl font-display font-bold text-green-500">
                      {fmt(
                        salesSummary && salesSummary.invoiceCount > 0
                          ? salesSummary.totalSales /
                              Number(salesSummary.invoiceCount)
                          : 0,
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Avg Invoice Value
                    </div>
                  </CardContent>
                </Card>
              </div>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-display">
                    Daily Sales Trend
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {dailyData.length === 0 ? (
                    <div
                      className="text-center py-8 text-muted-foreground"
                      data-ocid="reports.sales.chart.empty_state"
                    >
                      <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-20" />
                      No data for selected period
                    </div>
                  ) : (
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={dailyData}>
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="oklch(var(--border))"
                        />
                        <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                          formatter={(v: number) => [fmt(v), "Sales"]}
                          contentStyle={{
                            background: "oklch(var(--popover))",
                            border: "1px solid oklch(var(--border))",
                            borderRadius: "8px",
                            fontSize: 11,
                          }}
                        />
                        <Bar
                          dataKey="sales"
                          fill="oklch(0.70 0.16 195)"
                          radius={[4, 4, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="inventory">
          {loadingInv ? (
            <div
              className="flex justify-center py-16"
              data-ocid="reports.inventory.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <Card className="border-border">
                  <CardContent className="p-5">
                    <div className="text-2xl font-display font-bold text-primary">
                      {fmt((inventory ?? []).reduce((s, i) => s + i.value, 0))}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Total Inventory Value
                    </div>
                  </CardContent>
                </Card>
                <Card className="border-border">
                  <CardContent className="p-5">
                    <div className="text-2xl font-display font-bold">
                      {
                        (inventory ?? []).filter(
                          (i) =>
                            i.product.stockQty <= i.product.lowStockThreshold,
                        ).length
                      }
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Low Stock Items
                    </div>
                  </CardContent>
                </Card>
              </div>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Product</TableHead>
                      <TableHead>Stock</TableHead>
                      <TableHead>Unit Cost</TableHead>
                      <TableHead className="text-right">Total Value</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(inventory ?? []).length === 0 ? (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="text-center py-8 text-muted-foreground"
                          data-ocid="reports.inventory.empty_state"
                        >
                          No inventory data
                        </TableCell>
                      </TableRow>
                    ) : (
                      (inventory ?? [])
                        .sort((a, b) => b.value - a.value)
                        .map((item, i) => (
                          <TableRow
                            key={item.product.id}
                            className="hover:bg-muted/20"
                            data-ocid={`reports.inventory.row.${i + 1}`}
                          >
                            <TableCell className="font-medium text-sm">
                              {item.product.name}
                            </TableCell>
                            <TableCell className="text-sm">
                              {String(item.product.stockQty)}{" "}
                              {item.product.unit}
                            </TableCell>
                            <TableCell className="text-sm">
                              {fmt(item.product.purchasePrice)}
                            </TableCell>
                            <TableCell className="text-right font-semibold">
                              {fmt(item.value)}
                            </TableCell>
                          </TableRow>
                        ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="pl">
          <DateRange />
          {loadingPl ? (
            <div
              className="flex justify-center py-16"
              data-ocid="reports.pl.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  {
                    label: "Revenue",
                    value: pl?.revenue ?? 0,
                    color: "text-green-500",
                  },
                  {
                    label: "Cost",
                    value: pl?.cost ?? 0,
                    color: "text-destructive",
                  },
                  {
                    label: "Expenses",
                    value: pl?.expenses ?? 0,
                    color: "text-amber-500",
                  },
                  {
                    label: "Net Profit",
                    value: pl?.profit ?? 0,
                    color:
                      (pl?.profit ?? 0) >= 0
                        ? "text-green-500"
                        : "text-destructive",
                  },
                ].map((item) => (
                  <Card key={item.label} className="border-border">
                    <CardContent className="p-5">
                      <div
                        className={`text-2xl font-display font-bold ${item.color}`}
                      >
                        {fmt(item.value)}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {item.label}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-display">
                    P&amp;L Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={200}>
                    <BarChart
                      data={[
                        {
                          name: "P&L",
                          revenue: pl?.revenue ?? 0,
                          cost: pl?.cost ?? 0,
                          expenses: pl?.expenses ?? 0,
                          profit: pl?.profit ?? 0,
                        },
                      ]}
                    >
                      <CartesianGrid
                        strokeDasharray="3 3"
                        stroke="oklch(var(--border))"
                      />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip
                        formatter={(v: number) => [fmt(v)]}
                        contentStyle={{
                          background: "oklch(var(--popover))",
                          border: "1px solid oklch(var(--border))",
                          borderRadius: "8px",
                          fontSize: 11,
                        }}
                      />
                      <Bar
                        dataKey="revenue"
                        fill={PIE_COLORS[0]}
                        radius={[4, 4, 0, 0]}
                        name="Revenue"
                      />
                      <Bar
                        dataKey="cost"
                        fill={PIE_COLORS[4]}
                        radius={[4, 4, 0, 0]}
                        name="Cost"
                      />
                      <Bar
                        dataKey="expenses"
                        fill={PIE_COLORS[1]}
                        radius={[4, 4, 0, 0]}
                        name="Expenses"
                      />
                      <Bar
                        dataKey="profit"
                        fill={PIE_COLORS[2]}
                        radius={[4, 4, 0, 0]}
                        name="Profit"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="expenses">
          <DateRange />
          {loadingExp ? (
            <div
              className="flex justify-center py-16"
              data-ocid="reports.expenses.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (expSummary ?? []).length === 0 ? (
            <div
              className="text-center py-16 text-muted-foreground"
              data-ocid="reports.expenses.empty_state"
            >
              No expense data for period
            </div>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-sm font-display">
                    By Category
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={expSummary}
                        dataKey="total"
                        nameKey="category"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label={({ category, percent }) =>
                          `${category} ${(percent * 100).toFixed(0)}%`
                        }
                        labelLine={false}
                      >
                        {(expSummary ?? []).map((_, i) => (
                          <Cell
                            key={String(i)}
                            fill={PIE_COLORS[i % PIE_COLORS.length]}
                          />
                        ))}
                      </Pie>
                      <Tooltip
                        formatter={(v: number) => [fmt(v)]}
                        contentStyle={{
                          background: "oklch(var(--popover))",
                          border: "1px solid oklch(var(--border))",
                          borderRadius: "8px",
                          fontSize: 11,
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
              <div className="rounded-xl border border-border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/30">
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(expSummary ?? [])
                      .sort((a, b) => b.total - a.total)
                      .map((item, i) => (
                        <TableRow
                          key={item.category}
                          data-ocid={`reports.expense.row.${i + 1}`}
                        >
                          <TableCell className="font-medium text-sm">
                            {item.category}
                          </TableCell>
                          <TableCell className="text-right text-destructive font-semibold">
                            {fmt(item.total)}
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
