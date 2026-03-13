import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Eye, Loader2, Plus, Receipt, Search, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { SaleInvoice, SaleInvoiceItem } from "../backend.d";
import {
  useCreateSaleInvoice,
  useParties,
  useProducts,
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

const STATUS_STYLES: Record<string, string> = {
  paid: "bg-green-500/20 text-green-500 border-green-500/30",
  unpaid: "bg-destructive/20 text-destructive border-destructive/30",
  partial: "bg-amber-500/20 text-amber-500 border-amber-500/30",
};

export function Sales() {
  const { data: invoices, isLoading } = useSaleInvoices();
  const { data: products } = useProducts();
  const { data: parties } = useParties();
  const createInvoice = useCreateSaleInvoice();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<SaleInvoice | null>(null);

  // New invoice form state
  const [partyId, setPartyId] = useState("");
  const [items, setItems] = useState<
    { productId: string; qty: number; discount: number }[]
  >([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [status, setStatus] = useState("unpaid");
  const [taxRate] = useState(18);

  const productMap = useMemo(() => {
    const m: Record<string, import("../backend.d").Product> = {};
    for (const p of products ?? []) {
      m[p.id] = p;
    }
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    return (invoices ?? [])
      .filter((inv) => {
        const matchSearch =
          !search ||
          inv.invoiceNumber.toLowerCase().includes(search.toLowerCase());
        const matchStatus =
          statusFilter === "all" || inv.status === statusFilter;
        return matchSearch && matchStatus;
      })
      .sort((a, b) => Number(b.date - a.date));
  }, [invoices, search, statusFilter]);

  const addItem = () =>
    setItems((prev) => [...prev, { productId: "", qty: 1, discount: 0 }]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );
  };

  const calcSubtotal = () =>
    items.reduce((sum, it) => {
      const p = productMap[it.productId];
      if (!p) return sum;
      return sum + p.salePrice * it.qty * (1 - it.discount / 100);
    }, 0);

  const subtotal = calcSubtotal();
  const taxAmt = (subtotal * taxRate) / 100;
  const total = subtotal + taxAmt;

  const handleCreate = async () => {
    if (items.length === 0 || items.some((it) => !it.productId)) {
      toast.error("Add at least one product");
      return;
    }
    try {
      const inv: SaleInvoice = {
        id: crypto.randomUUID(),
        invoiceNumber: `INV-${Date.now()}`,
        date: BigInt(Date.now()) * BigInt(1_000_000),
        partyId,
        items: items.map(
          (it) =>
            ({
              productId: it.productId,
              qty: BigInt(it.qty),
              price: productMap[it.productId]?.salePrice ?? 0,
              discount: it.discount,
            }) as SaleInvoiceItem,
        ),
        subtotal,
        tax: taxAmt,
        total,
        paidAmount:
          status === "paid" ? total : status === "partial" ? total / 2 : 0,
        paymentMode,
        status,
        createdBy: "",
      };
      await createInvoice.mutateAsync(inv);
      toast.success("Invoice created");
      setSheetOpen(false);
      setItems([]);
      setPartyId("");
      setStatus("unpaid");
    } catch {
      toast.error("Failed to create invoice");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="sales.page">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search invoices..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="sales.search_input"
          />
        </div>
        <div className="flex gap-2">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32" data-ocid="sales.status.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
              <SelectItem value="unpaid">Unpaid</SelectItem>
              <SelectItem value="partial">Partial</SelectItem>
            </SelectContent>
          </Select>
          <Button
            onClick={() => setSheetOpen(true)}
            data-ocid="sales.new.primary_button"
          >
            <Plus className="w-4 h-4 mr-2" /> New Invoice
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="sales.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="sales.empty_state"
        >
          <Receipt className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No invoices found</p>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-border overflow-hidden"
        >
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30">
                <TableHead>Invoice #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Party</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((inv, i) => {
                const party = (parties ?? []).find((p) => p.id === inv.partyId);
                return (
                  <TableRow
                    key={inv.id}
                    className="hover:bg-muted/20"
                    data-ocid={`sales.invoice.row.${i + 1}`}
                  >
                    <TableCell className="font-mono font-medium text-sm">
                      {inv.invoiceNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {toDate(inv.date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {party?.name || "—"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmt(inv.total)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded border font-medium",
                          STATUS_STYLES[inv.status] ||
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {inv.status}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-7 h-7"
                        onClick={() => setViewInvoice(inv)}
                        data-ocid={`sales.invoice.view.button.${i + 1}`}
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      )}

      {/* Create Invoice Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-lg"
          data-ocid="sales.new.sheet"
        >
          <SheetHeader>
            <SheetTitle className="font-display">New Invoice</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-4 pr-4">
              <div className="space-y-1">
                <Label>Party (Customer)</Label>
                <Select value={partyId} onValueChange={setPartyId}>
                  <SelectTrigger data-ocid="sales.party.select">
                    <SelectValue placeholder="Select party" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Walk-in Customer</SelectItem>
                    {(parties ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addItem}
                    data-ocid="sales.add.item.button"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Item
                  </Button>
                </div>
                {items.map((item, idx) => (
                  <div
                    key={String(idx) + (item.productId || "")}
                    className="bg-muted/30 rounded-lg p-3 space-y-2"
                  >
                    <div className="flex gap-2">
                      <Select
                        value={item.productId}
                        onValueChange={(v) => updateItem(idx, "productId", v)}
                      >
                        <SelectTrigger
                          className="flex-1"
                          data-ocid={`sales.item.product.select.${idx + 1}`}
                        >
                          <SelectValue placeholder="Select product" />
                        </SelectTrigger>
                        <SelectContent>
                          {(products ?? []).map((p) => (
                            <SelectItem key={p.id} value={p.id}>
                              {p.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8"
                        onClick={() => removeItem(idx)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <Label className="text-xs">Qty</Label>
                        <Input
                          type="number"
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(idx, "qty", Number(e.target.value))
                          }
                          className="h-8"
                        />
                      </div>
                      <div>
                        <Label className="text-xs">Discount %</Label>
                        <Input
                          type="number"
                          value={item.discount}
                          onChange={(e) =>
                            updateItem(idx, "discount", Number(e.target.value))
                          }
                          className="h-8"
                        />
                      </div>
                    </div>
                    {item.productId && productMap[item.productId] && (
                      <div className="text-xs text-muted-foreground">
                        {fmt(productMap[item.productId].salePrice)} × {item.qty}{" "}
                        ={" "}
                        {fmt(
                          productMap[item.productId].salePrice *
                            item.qty *
                            (1 - item.discount / 100),
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Payment Mode</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger data-ocid="sales.payment.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="upi">UPI</SelectItem>
                      <SelectItem value="credit">Credit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={status} onValueChange={setStatus}>
                    <SelectTrigger data-ocid="sales.invoice.status.select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="unpaid">Unpaid</SelectItem>
                      <SelectItem value="partial">Partial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="bg-muted/30 rounded-lg p-4 space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>GST ({taxRate}%)</span>
                  <span>{fmt(taxAmt)}</span>
                </div>
                <Separator className="my-2" />
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{fmt(total)}</span>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setSheetOpen(false)}
                  data-ocid="sales.sheet.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={createInvoice.isPending}
                  data-ocid="sales.sheet.save_button"
                >
                  {createInvoice.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Invoice"
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>

      {/* View Invoice Modal */}
      <Dialog
        open={!!viewInvoice}
        onOpenChange={(o) => !o && setViewInvoice(null)}
      >
        <DialogContent className="max-w-md" data-ocid="sales.view.dialog">
          <DialogHeader>
            <DialogTitle className="font-mono">
              {viewInvoice?.invoiceNumber}
            </DialogTitle>
          </DialogHeader>
          {viewInvoice && (
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-muted-foreground">Date:</span>{" "}
                  {toDate(viewInvoice.date)}
                </div>
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  <span
                    className={cn(
                      "font-medium",
                      viewInvoice.status === "paid"
                        ? "text-green-500"
                        : "text-destructive",
                    )}
                  >
                    {viewInvoice.status}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  {viewInvoice.paymentMode}
                </div>
              </div>
              <Separator />
              <div className="space-y-1">
                {viewInvoice.items.map((it, i) => {
                  const p = productMap[it.productId];
                  return (
                    <div
                      key={String(i) + it.productId}
                      className="flex justify-between"
                    >
                      <span>
                        {p?.name || it.productId} × {String(it.qty)}
                      </span>
                      <span className="font-semibold">
                        {fmt(
                          it.price * Number(it.qty) * (1 - it.discount / 100),
                        )}
                      </span>
                    </div>
                  );
                })}
              </div>
              <Separator />
              <div className="space-y-1">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{fmt(viewInvoice.subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Tax</span>
                  <span>{fmt(viewInvoice.tax)}</span>
                </div>
                <div className="flex justify-between font-bold text-base">
                  <span>Total</span>
                  <span className="text-primary">{fmt(viewInvoice.total)}</span>
                </div>
              </div>
              <Button
                className="w-full"
                onClick={() => window.print()}
                data-ocid="sales.view.print.button"
              >
                Print Invoice
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
