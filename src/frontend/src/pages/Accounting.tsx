import { Button } from "@/components/ui/button";
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
import { cn } from "@/lib/utils";
import {
  BookOpen,
  DollarSign,
  Loader2,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import {
  useExpenses,
  useProfitLoss,
  usePurchaseBills,
  useSaleInvoices,
} from "../hooks/useQueries";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
const toDate = (t: bigint) =>
  new Date(Number(t / BigInt(1_000_000))).toLocaleDateString("en-IN");

export function Accounting() {
  const now = new Date();
  const [startDate, setStartDate] = useState(() => {
    const d = new Date(now.getFullYear(), now.getMonth(), 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(() => now.toISOString().split("T")[0]);

  const { data: pl, isLoading: loadingPl } = useProfitLoss(
    new Date(startDate),
    new Date(endDate),
  );
  const { data: invoices } = useSaleInvoices();
  const { data: bills } = usePurchaseBills();
  const { data: expenses } = useExpenses();

  const ledgerEntries = [
    ...(invoices ?? []).map((inv) => ({
      date: inv.date,
      type: "Sales",
      ref: inv.invoiceNumber,
      debit: 0,
      credit: inv.total,
      balance: inv.total,
    })),
    ...(bills ?? []).map((b) => ({
      date: b.date,
      type: "Purchase",
      ref: b.billNumber,
      debit: b.total,
      credit: 0,
      balance: -b.total,
    })),
    ...(expenses ?? []).map((e) => ({
      date: e.date,
      type: "Expense",
      ref: e.description,
      debit: e.amount,
      credit: 0,
      balance: -e.amount,
    })),
  ]
    .sort((a, b) => Number(b.date - a.date))
    .slice(0, 50);

  return (
    <div className="p-4 md:p-6 space-y-6" data-ocid="accounting.page">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="space-y-1">
          <Label>From</Label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-40"
            data-ocid="accounting.startdate.input"
          />
        </div>
        <div className="space-y-1">
          <Label>To</Label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-40"
            data-ocid="accounting.enddate.input"
          />
        </div>
      </div>

      <Tabs defaultValue="pl">
        <TabsList>
          <TabsTrigger value="pl" data-ocid="accounting.pl.tab">
            P&amp;L
          </TabsTrigger>
          <TabsTrigger value="ledger" data-ocid="accounting.ledger.tab">
            Ledger
          </TabsTrigger>
          <TabsTrigger value="balance" data-ocid="accounting.balance.tab">
            Balance Sheet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pl" className="mt-4">
          {loadingPl ? (
            <div
              className="flex items-center justify-center py-16"
              data-ocid="accounting.pl.loading_state"
            >
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                {
                  label: "Revenue",
                  value: pl?.revenue ?? 0,
                  icon: TrendingUp,
                  color: "text-green-500",
                  bg: "bg-green-500/10",
                },
                {
                  label: "Cost of Goods",
                  value: pl?.cost ?? 0,
                  icon: TrendingDown,
                  color: "text-destructive",
                  bg: "bg-destructive/10",
                },
                {
                  label: "Expenses",
                  value: pl?.expenses ?? 0,
                  icon: DollarSign,
                  color: "text-amber-500",
                  bg: "bg-amber-500/10",
                },
                {
                  label: "Net Profit",
                  value: pl?.profit ?? 0,
                  icon: BookOpen,
                  color:
                    (pl?.profit ?? 0) >= 0
                      ? "text-green-500"
                      : "text-destructive",
                  bg:
                    (pl?.profit ?? 0) >= 0
                      ? "bg-green-500/10"
                      : "bg-destructive/10",
                },
              ].map((item) => (
                <Card key={item.label} className="border-border">
                  <CardContent className="p-5">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center mb-3",
                        item.bg,
                      )}
                    >
                      <item.icon className={cn("w-5 h-5", item.color)} />
                    </div>
                    <div
                      className={cn(
                        "font-display font-bold text-2xl",
                        item.color,
                      )}
                    >
                      {fmt(item.value)}
                    </div>
                    <div className="text-sm text-muted-foreground mt-1">
                      {item.label}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="ledger" className="mt-4">
          <div className="rounded-xl border border-border overflow-hidden">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/30">
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Reference</TableHead>
                    <TableHead className="text-right">Debit (₹)</TableHead>
                    <TableHead className="text-right">Credit (₹)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {ledgerEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-12 text-muted-foreground"
                        data-ocid="accounting.ledger.empty_state"
                      >
                        No entries found
                      </TableCell>
                    </TableRow>
                  ) : (
                    ledgerEntries.map((entry, i) => (
                      <TableRow
                        key={String(entry.date) + (entry.ref || String(i))}
                        className="hover:bg-muted/20"
                        data-ocid={`accounting.ledger.row.${i + 1}`}
                      >
                        <TableCell className="text-sm">
                          {toDate(entry.date)}
                        </TableCell>
                        <TableCell>
                          <span className="text-xs font-medium bg-muted px-2 py-0.5 rounded">
                            {entry.type}
                          </span>
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {entry.ref}
                        </TableCell>
                        <TableCell className="text-right text-destructive">
                          {entry.debit > 0 ? fmt(entry.debit) : "—"}
                        </TableCell>
                        <TableCell className="text-right text-green-500">
                          {entry.credit > 0 ? fmt(entry.credit) : "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="balance" className="mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">Assets</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Cash & Bank</span>
                  <span className="font-semibold text-green-500">
                    {fmt(
                      (invoices ?? []).reduce((s, i) => s + i.paidAmount, 0),
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Receivables</span>
                  <span className="font-semibold">
                    {fmt(
                      (invoices ?? []).reduce(
                        (s, i) => s + (i.total - i.paidAmount),
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>Total Assets</span>
                  <span className="text-primary">
                    {fmt((invoices ?? []).reduce((s, i) => s + i.total, 0))}
                  </span>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="text-base font-display">
                  Liabilities
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span>Payables</span>
                  <span className="font-semibold text-destructive">
                    {fmt(
                      (bills ?? []).reduce(
                        (s, b) => s + (b.total - b.paidAmount),
                        0,
                      ),
                    )}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Total Purchase</span>
                  <span className="font-semibold">
                    {fmt((bills ?? []).reduce((s, b) => s + b.total, 0))}
                  </span>
                </div>
                <div className="flex justify-between border-t border-border pt-2 font-bold">
                  <span>Net Worth</span>
                  <span className="text-primary">{fmt(pl?.profit ?? 0)}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
