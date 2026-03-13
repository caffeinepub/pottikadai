import { Button } from "@/components/ui/button";
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
import { Loader2, Plus, Search, ShoppingBag, Trash2 } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { PurchaseBill, SaleInvoiceItem } from "../backend.d";
import {
  useCreatePurchaseBill,
  useParties,
  useProducts,
  usePurchaseBills,
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

export function Purchase() {
  const { data: bills, isLoading } = usePurchaseBills();
  const { data: products } = useProducts();
  const { data: parties } = useParties();
  const createBill = useCreatePurchaseBill();

  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [partyId, setPartyId] = useState("");
  const [billNumber, setBillNumber] = useState("");
  const [items, setItems] = useState<
    { productId: string; qty: number; discount: number }[]
  >([]);
  const [paymentMode, setPaymentMode] = useState("cash");
  const [status, setStatus] = useState("unpaid");

  const productMap = useMemo(() => {
    const m: Record<string, import("../backend.d").Product> = {};
    for (const p of products ?? []) {
      m[p.id] = p;
    }
    return m;
  }, [products]);

  const filtered = useMemo(() => {
    return (bills ?? [])
      .filter(
        (b) =>
          !search || b.billNumber.toLowerCase().includes(search.toLowerCase()),
      )
      .sort((a, b) => Number(b.date - a.date));
  }, [bills, search]);

  const addItem = () =>
    setItems((prev) => [...prev, { productId: "", qty: 1, discount: 0 }]);
  const removeItem = (idx: number) =>
    setItems((prev) => prev.filter((_, i) => i !== idx));
  const updateItem = (idx: number, field: string, value: string | number) => {
    setItems((prev) =>
      prev.map((it, i) => (i === idx ? { ...it, [field]: value } : it)),
    );
  };

  const subtotal = items.reduce((sum, it) => {
    const p = productMap[it.productId];
    if (!p) return sum;
    return sum + p.purchasePrice * it.qty * (1 - it.discount / 100);
  }, 0);
  const taxAmt = subtotal * 0.18;
  const total = subtotal + taxAmt;

  const handleCreate = async () => {
    if (!billNumber || items.length === 0) {
      toast.error("Bill number and items are required");
      return;
    }
    try {
      const bill: PurchaseBill = {
        id: crypto.randomUUID(),
        billNumber,
        date: BigInt(Date.now()) * BigInt(1_000_000),
        partyId,
        items: items.map(
          (it) =>
            ({
              productId: it.productId,
              qty: BigInt(it.qty),
              price: productMap[it.productId]?.purchasePrice ?? 0,
              discount: it.discount,
            }) as SaleInvoiceItem,
        ),
        subtotal,
        tax: taxAmt,
        total,
        paidAmount: status === "paid" ? total : 0,
        paymentMode,
        status,
      };
      await createBill.mutateAsync(bill);
      toast.success("Purchase bill created");
      setSheetOpen(false);
      setItems([]);
      setBillNumber("");
      setPartyId("");
      setStatus("unpaid");
    } catch {
      toast.error("Failed to create bill");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="purchase.page">
      <div className="flex gap-3 items-center justify-between">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search bills..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="purchase.search_input"
          />
        </div>
        <Button
          onClick={() => setSheetOpen(true)}
          data-ocid="purchase.new.primary_button"
        >
          <Plus className="w-4 h-4 mr-2" /> New Bill
        </Button>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="purchase.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="purchase.empty_state"
        >
          <ShoppingBag className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No purchase bills yet</p>
          <Button className="mt-4" onClick={() => setSheetOpen(true)}>
            Add Bill
          </Button>
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
                <TableHead>Bill #</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="hidden md:table-cell">Vendor</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((b, i) => {
                const party = (parties ?? []).find((p) => p.id === b.partyId);
                return (
                  <TableRow
                    key={b.id}
                    className="hover:bg-muted/20"
                    data-ocid={`purchase.bill.row.${i + 1}`}
                  >
                    <TableCell className="font-mono font-medium text-sm">
                      {b.billNumber}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {toDate(b.date)}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {party?.name || "—"}
                    </TableCell>
                    <TableCell className="font-semibold">
                      {fmt(b.total)}
                    </TableCell>
                    <TableCell>
                      <span
                        className={cn(
                          "text-xs px-2 py-1 rounded border font-medium",
                          STATUS_STYLES[b.status] ||
                            "bg-muted text-muted-foreground",
                        )}
                      >
                        {b.status}
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </motion.div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-lg"
          data-ocid="purchase.new.sheet"
        >
          <SheetHeader>
            <SheetTitle className="font-display">New Purchase Bill</SheetTitle>
          </SheetHeader>
          <ScrollArea className="h-[calc(100vh-120px)] mt-4">
            <div className="space-y-4 pr-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Bill Number *</Label>
                  <Input
                    value={billNumber}
                    onChange={(e) => setBillNumber(e.target.value)}
                    placeholder="BILL-001"
                    data-ocid="purchase.billnumber.input"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Vendor</Label>
                  <Select value={partyId} onValueChange={setPartyId}>
                    <SelectTrigger data-ocid="purchase.vendor.select">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {(parties ?? [])
                        .filter((p) => p.kind === "vendor")
                        .map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {p.name}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Items</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={addItem}
                    data-ocid="purchase.add.item.button"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add
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
                        <SelectTrigger className="flex-1">
                          <SelectValue placeholder="Product" />
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
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Payment</Label>
                  <Select value={paymentMode} onValueChange={setPaymentMode}>
                    <SelectTrigger data-ocid="purchase.payment.select">
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
                    <SelectTrigger data-ocid="purchase.status.select">
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
                  <span>Tax (18%)</span>
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
                  data-ocid="purchase.sheet.cancel_button"
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleCreate}
                  disabled={createBill.isPending}
                  data-ocid="purchase.sheet.save_button"
                >
                  {createBill.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    "Create Bill"
                  )}
                </Button>
              </div>
            </div>
          </ScrollArea>
        </SheetContent>
      </Sheet>
    </div>
  );
}
