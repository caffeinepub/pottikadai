import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Edit, FileText, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Party, Product, Quotation, SaleInvoice } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useParties, useProducts } from "../hooks/useQueries";

// ── helpers ──────────────────────────────────────────────────────────────────
const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(
    n,
  );

function genUUID() {
  return crypto.randomUUID
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2);
}

// ── hooks ─────────────────────────────────────────────────────────────────────
function useQuotations() {
  const { actor, isFetching } = useActor();
  return useQuery<Quotation[]>({
    queryKey: ["quotations"],
    queryFn: async () => (actor ? actor.listQuotations() : []),
    enabled: !!actor && !isFetching,
  });
}

function useCreateQuotation() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q: Quotation) => actor!.createQuotation(q),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
  });
}

function useUpdateQuotation() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (q: Quotation) => actor!.updateQuotation(q),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quotations"] }),
  });
}

function useCreateSaleInvoiceMut() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inv: SaleInvoice) => actor!.createSaleInvoice(inv),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale-invoices"] });
      qc.invalidateQueries({ queryKey: ["quotations"] });
    },
  });
}

// ── status badge ─────────────────────────────────────────────────────────────
const STATUS_STYLES: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  confirmed: "bg-primary/15 text-primary border-primary/25",
  converted: "bg-emerald-500/15 text-emerald-400 border-emerald-500/25",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold border",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground",
      )}
    >
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

// ── line item ─────────────────────────────────────────────────────────────────
interface LineItem {
  _key: string;
  productId: string;
  qty: number;
  price: number;
  discount: number;
}

function lineTotal(item: LineItem) {
  return item.qty * item.price * (1 - item.discount / 100);
}

interface LineItemRowProps {
  item: LineItem;
  index: number;
  products: Product[];
  onChange: (index: number, updated: LineItem) => void;
  onRemove: (index: number) => void;
}

function LineItemRow({
  item,
  index,
  products,
  onChange,
  onRemove,
}: LineItemRowProps) {
  const handleProductChange = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    onChange(index, {
      ...item,
      productId,
      price: product ? product.salePrice : item.price,
    });
  };

  return (
    <div className="grid grid-cols-[1fr_80px_100px_80px_90px_36px] gap-2 items-center">
      <Select value={item.productId} onValueChange={handleProductChange}>
        <SelectTrigger className="h-8 text-xs">
          <SelectValue placeholder="Select product" />
        </SelectTrigger>
        <SelectContent>
          {products.map((p) => (
            <SelectItem key={p.id} value={p.id}>
              {p.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Input
        data-ocid="quotations.form.qty.input"
        type="number"
        min={1}
        value={item.qty}
        onChange={(e) =>
          onChange(index, { ...item, qty: Number(e.target.value) })
        }
        className="h-8 text-xs text-right"
      />
      <Input
        data-ocid="quotations.form.price.input"
        type="number"
        min={0}
        value={item.price}
        onChange={(e) =>
          onChange(index, { ...item, price: Number(e.target.value) })
        }
        className="h-8 text-xs text-right"
      />
      <Input
        type="number"
        min={0}
        max={100}
        value={item.discount}
        onChange={(e) =>
          onChange(index, { ...item, discount: Number(e.target.value) })
        }
        className="h-8 text-xs text-right"
      />
      <div className="text-xs text-right font-mono text-foreground/80 tabular-nums">
        {fmt(lineTotal(item))}
      </div>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 text-destructive hover:text-destructive"
        onClick={() => onRemove(index)}
      >
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  );
}

// ── quotation form ────────────────────────────────────────────────────────────
interface QuotationFormProps {
  quotation?: Quotation | null;
  parties: Party[];
  products: Product[];
  onSave: (q: Quotation, submitAs: "draft" | "confirmed") => void;
  onCancel: () => void;
  isSaving: boolean;
  session: { username: string };
}

function QuotationForm({
  quotation,
  parties,
  products,
  onSave,
  onCancel,
  isSaving,
  session,
}: QuotationFormProps) {
  const [partyId, setPartyId] = useState(quotation?.partyId ?? "");
  const [notes, setNotes] = useState(quotation?.notes ?? "");
  const [items, setItems] = useState<LineItem[]>(() => {
    if (quotation?.items?.length) {
      return quotation.items.map((it) => ({
        _key: genUUID(),
        productId: it.productId,
        qty: Number(it.qty),
        price: it.price,
        discount: it.discount,
      }));
    }
    return [{ _key: genUUID(), productId: "", qty: 1, price: 0, discount: 0 }];
  });

  const subtotal = items.reduce((s, it) => s + lineTotal(it), 0);
  const totalQty = items.reduce((s, it) => s + it.qty, 0);
  const weightedGst =
    totalQty > 0
      ? items.reduce((s, it) => {
          const prod = products.find((p) => p.id === it.productId);
          return s + (prod?.gstRate ?? 0) * it.qty;
        }, 0) / totalQty
      : 0;
  const tax = subtotal * (weightedGst / 100);
  const total = subtotal + tax;

  const handleItemChange = (index: number, updated: LineItem) => {
    setItems((prev) => prev.map((it, i) => (i === index ? updated : it)));
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddItem = () => {
    setItems((prev) => [
      ...prev,
      { _key: genUUID(), productId: "", qty: 1, price: 0, discount: 0 },
    ]);
  };

  const buildQuotation = (status: "draft" | "confirmed"): Quotation => ({
    id: quotation?.id ?? genUUID(),
    quotationNumber: quotation?.quotationNumber ?? "",
    date: quotation?.date ?? BigInt(Date.now()) * BigInt(1_000_000),
    partyId,
    items: items.map((it) => ({
      productId: it.productId,
      qty: BigInt(it.qty),
      price: it.price,
      discount: it.discount,
    })),
    subtotal,
    tax,
    total,
    status,
    notes,
    createdBy: session.username,
  });

  return (
    <div className="flex flex-col gap-5 h-full">
      <div className="grid grid-cols-1 gap-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">
            Party / Customer
          </Label>
          <Select value={partyId} onValueChange={setPartyId}>
            <SelectTrigger data-ocid="quotations.form.party.select">
              <SelectValue placeholder="Select party…" />
            </SelectTrigger>
            <SelectContent>
              {parties.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Notes</Label>
          <Textarea
            data-ocid="quotations.form.notes.textarea"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes…"
            className="resize-none h-20"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs text-muted-foreground">Line Items</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={handleAddItem}
          >
            <Plus className="w-3 h-3" /> Add Item
          </Button>
        </div>
        <div className="grid grid-cols-[1fr_80px_100px_80px_90px_36px] gap-2 text-xs text-muted-foreground px-0.5">
          <span>Product</span>
          <span className="text-right">Qty</span>
          <span className="text-right">Unit Price</span>
          <span className="text-right">Disc %</span>
          <span className="text-right">Total</span>
          <span />
        </div>
        <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
          {items.map((item, i) => (
            <LineItemRow
              key={item._key}
              item={item}
              index={i}
              products={products}
              onChange={handleItemChange}
              onRemove={handleRemoveItem}
            />
          ))}
        </div>
      </div>

      <div className="ml-auto w-48 space-y-1.5 text-sm">
        <div className="flex justify-between text-muted-foreground">
          <span>Subtotal</span>
          <span className="font-mono tabular-nums">{fmt(subtotal)}</span>
        </div>
        <div className="flex justify-between text-muted-foreground">
          <span>GST ({weightedGst.toFixed(1)}%)</span>
          <span className="font-mono tabular-nums">{fmt(tax)}</span>
        </div>
        <div className="flex justify-between font-bold text-foreground border-t border-border pt-1.5">
          <span>Total</span>
          <span className="font-mono tabular-nums">{fmt(total)}</span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          data-ocid="quotations.form.cancel_button"
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => onSave(buildQuotation("draft"), "draft")}
          data-ocid="quotations.form.submit_button"
          disabled={isSaving || !partyId}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save as Draft
        </Button>
        <Button
          type="button"
          onClick={() => onSave(buildQuotation("confirmed"), "confirmed")}
          disabled={isSaving || !partyId}
        >
          {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Confirm Quotation
        </Button>
      </div>
    </div>
  );
}

// ── convert dialog ────────────────────────────────────────────────────────────
interface ConvertDialogProps {
  quotation: Quotation | null;
  parties: Party[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConvert: (quotation: Quotation, paymentMode: string) => void;
  isConverting: boolean;
}

function ConvertDialog({
  quotation,
  parties,
  open,
  onOpenChange,
  onConvert,
  isConverting,
}: ConvertDialogProps) {
  const [paymentMode, setPaymentMode] = useState("cash");

  if (!quotation) return null;

  const partyName =
    parties.find((p) => p.id === quotation.partyId)?.name ?? "—";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent data-ocid="quotations.convert.dialog" className="max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Convert to Invoice</DialogTitle>
          <DialogDescription>
            This will create a sale invoice from quotation{" "}
            <span className="font-semibold text-foreground">
              {quotation.quotationNumber || "(pending number)"}
            </span>
            .
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="rounded-lg border border-border bg-muted/30 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Party</span>
              <span className="font-medium">{partyName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Items</span>
              <span>{quotation.items.length}</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Total</span>
              <span className="text-primary">{fmt(quotation.total)}</span>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Payment Mode
            </Label>
            <Select value={paymentMode} onValueChange={setPaymentMode}>
              <SelectTrigger data-ocid="quotations.convert.payment.select">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="card">Card</SelectItem>
                <SelectItem value="upi">UPI</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            data-ocid="quotations.convert.cancel_button"
            disabled={isConverting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => onConvert(quotation, paymentMode)}
            data-ocid="quotations.convert.confirm_button"
            disabled={isConverting}
          >
            {isConverting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Convert to Invoice
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export function Quotations() {
  const { data: quotations = [], isLoading: loadingQ } = useQuotations();
  const { data: parties = [] } = useParties();
  const { data: products = [] } = useProducts();

  const createQ = useCreateQuotation();
  const updateQ = useUpdateQuotation();
  const createInv = useCreateSaleInvoiceMut();

  const [statusFilter, setStatusFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Quotation | null>(null);
  const [convertTarget, setConvertTarget] = useState<Quotation | null>(null);
  const [convertOpen, setConvertOpen] = useState(false);

  const session = (() => {
    try {
      const raw = localStorage.getItem("pottikadai-session");
      return raw
        ? (JSON.parse(raw) as { username: string; name: string })
        : { username: "admin", name: "Admin" };
    } catch {
      return { username: "admin", name: "Admin" };
    }
  })();

  const filtered =
    statusFilter === "all"
      ? quotations
      : quotations.filter((q) => q.status === statusFilter);

  const handleOpenCreate = () => {
    setEditTarget(null);
    setSheetOpen(true);
  };

  const handleOpenEdit = (q: Quotation) => {
    setEditTarget(q);
    setSheetOpen(true);
  };

  const handleSave = async (q: Quotation, _submitAs: "draft" | "confirmed") => {
    try {
      if (editTarget) {
        await updateQ.mutateAsync(q);
        toast.success("Quotation updated successfully");
      } else {
        await createQ.mutateAsync(q);
        toast.success("Quotation created successfully");
      }
      setSheetOpen(false);
      setEditTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to save quotation");
    }
  };

  const handleOpenConvert = (q: Quotation) => {
    setConvertTarget(q);
    setConvertOpen(true);
  };

  const handleConvert = async (q: Quotation, paymentMode: string) => {
    try {
      const now = BigInt(Date.now()) * BigInt(1_000_000);
      const d = new Date();
      const dateStr = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, "0")}${String(d.getDate()).padStart(2, "0")}`;
      const rand3 = String(Math.floor(Math.random() * 900) + 100);
      const invoiceNumber = `INV-${dateStr}-${rand3}`;

      const invoice: SaleInvoice = {
        id: genUUID(),
        invoiceNumber,
        date: now,
        partyId: q.partyId,
        items: q.items.map((it) => ({
          productId: it.productId,
          qty: it.qty,
          price: it.price,
          discount: it.discount,
        })),
        subtotal: q.subtotal,
        tax: q.tax,
        total: q.total,
        paidAmount: q.total,
        paymentMode,
        status: "paid",
        createdBy: session.username,
      };

      await createInv.mutateAsync(invoice);
      await updateQ.mutateAsync({ ...q, status: "converted" });

      toast.success("Quotation converted to invoice successfully");
      setConvertOpen(false);
      setConvertTarget(null);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to convert quotation");
    }
  };

  const formatDate = (t: bigint) => {
    const ms = Number(t) / 1_000_000;
    return new Date(ms).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const resolvePartyName = (id: string) =>
    parties.find((p) => p.id === id)?.name ?? "—";

  const isSaving = createQ.isPending || updateQ.isPending;
  const isConverting = createInv.isPending || updateQ.isPending;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display font-bold text-2xl text-foreground">
            Quotations
          </h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            Create and manage quotations, convert to invoices
          </p>
        </div>
        <Button
          onClick={handleOpenCreate}
          data-ocid="quotations.new_button"
          className="gap-2"
        >
          <Plus className="w-4 h-4" /> New Quotation
        </Button>
      </div>

      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList className="h-9" data-ocid="quotations.status.tab">
          <TabsTrigger value="all" className="text-xs">
            All ({quotations.length})
          </TabsTrigger>
          <TabsTrigger value="draft" className="text-xs">
            Draft ({quotations.filter((q) => q.status === "draft").length})
          </TabsTrigger>
          <TabsTrigger value="confirmed" className="text-xs">
            Confirmed (
            {quotations.filter((q) => q.status === "confirmed").length})
          </TabsTrigger>
          <TabsTrigger value="converted" className="text-xs">
            Converted (
            {quotations.filter((q) => q.status === "converted").length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {loadingQ ? (
        <div
          data-ocid="quotations.loading_state"
          className="flex items-center justify-center py-20 text-muted-foreground gap-3"
        >
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading quotations…</span>
        </div>
      ) : filtered.length === 0 ? (
        <div
          data-ocid="quotations.empty_state"
          className="flex flex-col items-center justify-center py-20 text-center gap-3"
        >
          <div className="w-14 h-14 rounded-2xl bg-muted/50 flex items-center justify-center">
            <FileText className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              No quotations found
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {statusFilter === "all"
                ? "Create your first quotation to get started."
                : `No ${statusFilter} quotations yet.`}
            </p>
          </div>
          {statusFilter === "all" && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleOpenCreate}
              className="gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Create Quotation
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-border overflow-hidden">
          <Table data-ocid="quotations.table">
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                <TableHead className="text-xs font-semibold">
                  Quotation #
                </TableHead>
                <TableHead className="text-xs font-semibold">Date</TableHead>
                <TableHead className="text-xs font-semibold">Party</TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Items
                </TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Total
                </TableHead>
                <TableHead className="text-xs font-semibold">Status</TableHead>
                <TableHead className="text-xs font-semibold text-right">
                  Actions
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((q, idx) => (
                <TableRow
                  key={q.id}
                  data-ocid={`quotations.item.${idx + 1}`}
                  className="hover:bg-muted/20"
                >
                  <TableCell className="font-mono text-xs font-semibold text-primary">
                    {q.quotationNumber || (
                      <span className="text-muted-foreground italic">
                        Pending
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-xs">
                    {formatDate(q.date)}
                  </TableCell>
                  <TableCell className="text-xs font-medium">
                    {resolvePartyName(q.partyId)}
                  </TableCell>
                  <TableCell className="text-xs text-right">
                    {q.items.length}
                  </TableCell>
                  <TableCell className="text-xs text-right font-mono font-semibold tabular-nums">
                    {fmt(q.total)}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={q.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={q.status === "converted"}
                        onClick={() => handleOpenEdit(q)}
                        data-ocid={`quotations.edit_button.${idx + 1}`}
                      >
                        <Edit className="w-3.5 h-3.5" /> Edit
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 px-2 text-xs gap-1"
                        disabled={q.status === "converted"}
                        onClick={() => handleOpenConvert(q)}
                        data-ocid={`quotations.convert_button.${idx + 1}`}
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Convert
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          side="right"
          className="w-full sm:max-w-2xl overflow-y-auto"
        >
          <SheetHeader className="mb-4">
            <SheetTitle className="font-display text-xl">
              {editTarget ? "Edit Quotation" : "New Quotation"}
            </SheetTitle>
            <SheetDescription>
              {editTarget
                ? `Editing ${editTarget.quotationNumber || "draft"}`
                : "Fill in the details to create a new quotation."}
            </SheetDescription>
          </SheetHeader>
          <QuotationForm
            quotation={editTarget}
            parties={parties}
            products={products}
            onSave={handleSave}
            onCancel={() => setSheetOpen(false)}
            isSaving={isSaving}
            session={session}
          />
        </SheetContent>
      </Sheet>

      <ConvertDialog
        quotation={convertTarget}
        parties={parties}
        open={convertOpen}
        onOpenChange={setConvertOpen}
        onConvert={handleConvert}
        isConverting={isConverting}
      />
    </div>
  );
}
