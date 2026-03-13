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
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Banknote,
  CheckCircle2,
  CreditCard,
  Loader2,
  Minus,
  Plus,
  Printer,
  ScanLine,
  Search,
  ShoppingCart,
  Smartphone,
  Trash2,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import { useCreateSaleInvoice, useProducts } from "../hooks/useQueries";
import { useCartStore } from "../store/cart";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const TAX_RATE = 18;

export function POS() {
  const { data: products } = useProducts();
  const createInvoice = useCreateSaleInvoice();
  const cart = useCartStore();

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [scannerOpen, setScannerOpen] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentMode, setPaymentMode] = useState<"cash" | "card" | "upi">(
    "cash",
  );
  const [amountTendered, setAmountTendered] = useState("");
  const [checkoutDone, setCheckoutDone] = useState(false);
  const [lastInvoiceNo, setLastInvoiceNo] = useState("");
  const [selectedParty, setSelectedParty] = useState("");

  const categories = useMemo(() => {
    const cats = new Set((products ?? []).map((p) => p.category));
    return ["all", ...Array.from(cats).filter(Boolean)];
  }, [products]);

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      if (!p.isActive) return false;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase());
      const matchCat = category === "all" || p.category === category;
      return matchSearch && matchCat;
    });
  }, [products, search, category]);

  const handleScan = (val: string) => {
    const product = products?.find((p) => p.sku === val || p.id === val);
    if (product) {
      cart.addItem(product);
      toast.success(`Added: ${product.name}`);
    } else {
      setSearch(val);
      toast.error(`No product found for: ${val}`);
    }
  };

  const subtotal = cart.subtotal();
  const taxAmt = cart.taxAmount(TAX_RATE);
  const total = cart.total(TAX_RATE);
  const change = Number(amountTendered) - total;

  const handleCheckout = async () => {
    if (cart.items.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    const invNo = `POS-${Date.now()}`;
    try {
      await createInvoice.mutateAsync({
        id: crypto.randomUUID(),
        invoiceNumber: invNo,
        date: BigInt(Date.now()) * BigInt(1_000_000),
        partyId: selectedParty,
        items: cart.items.map((i) => ({
          productId: i.product.id,
          qty: BigInt(i.qty),
          price: i.product.salePrice,
          discount: i.discount,
        })),
        subtotal,
        tax: taxAmt,
        total,
        paidAmount: total,
        paymentMode,
        status: "paid",
        createdBy: "",
      });
      setLastInvoiceNo(invNo);
      setCheckoutDone(true);
      cart.clearCart();
      toast.success("Sale completed!");
    } catch {
      toast.error("Failed to create invoice");
    }
  };

  const handleNewSale = () => {
    setCheckoutDone(false);
    setPaymentOpen(false);
    setAmountTendered("");
    setSelectedParty("");
  };

  return (
    <div className="flex h-full" data-ocid="pos.page">
      {/* Left: Product Grid */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-border">
        {/* Search + Scan */}
        <div className="p-4 border-b border-border flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search products or enter SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="pos.search_input"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScannerOpen(true)}
            data-ocid="pos.scan.button"
            className="flex-shrink-0"
          >
            <ScanLine className="w-4 h-4" />
          </Button>
        </div>

        {/* Categories */}
        <div className="px-4 py-2 border-b border-border overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {categories.map((cat) => (
              <button
                type="button"
                key={cat}
                onClick={() => setCategory(cat)}
                data-ocid="pos.category.tab"
                className={cn(
                  "px-3 py-1 rounded-full text-xs font-medium transition-colors capitalize",
                  category === cat
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground hover:bg-muted/80",
                )}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <ScrollArea className="flex-1">
          <div className="p-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {filtered.length === 0 ? (
              <div
                className="col-span-full text-center py-12 text-muted-foreground"
                data-ocid="pos.products.empty_state"
              >
                <Package className="w-10 h-10 mx-auto mb-2 opacity-30" />
                No products found
              </div>
            ) : (
              filtered.map((product, i) => {
                const isLow = product.stockQty <= product.lowStockThreshold;
                const outOfStock = product.stockQty <= BigInt(0);
                return (
                  <motion.button
                    key={product.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.02 }}
                    onClick={() => !outOfStock && cart.addItem(product)}
                    disabled={outOfStock}
                    data-ocid={`pos.product.card.${i + 1}`}
                    className={cn(
                      "relative flex flex-col text-left p-3 rounded-xl border bg-card transition-all duration-150",
                      outOfStock
                        ? "opacity-50 cursor-not-allowed border-border"
                        : "hover:border-primary/50 hover:shadow-md hover:-translate-y-0.5 active:scale-95 cursor-pointer",
                    )}
                  >
                    {isLow && !outOfStock && (
                      <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-destructive" />
                    )}
                    <div className="w-full aspect-square bg-muted/50 rounded-lg mb-2 flex items-center justify-center">
                      <Package className="w-8 h-8 text-muted-foreground/50" />
                    </div>
                    <div className="font-medium text-sm leading-tight line-clamp-2">
                      {product.name}
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {product.category}
                    </div>
                    <div className="mt-2 flex items-end justify-between">
                      <span className="font-bold text-primary">
                        {fmt(product.salePrice)}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        Qty: {String(product.stockQty)}
                      </span>
                    </div>
                    {outOfStock && (
                      <div className="text-xs text-destructive font-medium mt-1">
                        Out of stock
                      </div>
                    )}
                  </motion.button>
                );
              })
            )}
          </div>
        </ScrollArea>
      </div>

      {/* Right: Cart Panel */}
      <div className="w-80 lg:w-96 flex flex-col bg-card">
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2 className="font-display font-semibold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-primary" />
              Cart
            </h2>
            {cart.items.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive h-7 px-2 text-xs"
                onClick={() => cart.clearCart()}
                data-ocid="pos.cart.clear.button"
              >
                Clear
              </Button>
            )}
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="p-3 space-y-2">
            <AnimatePresence>
              {cart.items.length === 0 ? (
                <div
                  className="text-center py-12 text-muted-foreground"
                  data-ocid="pos.cart.empty_state"
                >
                  <ShoppingCart className="w-10 h-10 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">Cart is empty</p>
                  <p className="text-xs mt-1">Click products to add</p>
                </div>
              ) : (
                cart.items.map((item, i) => (
                  <motion.div
                    key={item.product.id}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    data-ocid={`pos.cart.item.${i + 1}`}
                    className="bg-muted/30 rounded-lg p-3"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm line-clamp-1">
                          {item.product.name}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {fmt(item.product.salePrice)} each
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => cart.removeItem(item.product.id)}
                        className="p-1 hover:text-destructive transition-colors ml-2"
                        data-ocid={`pos.cart.delete_button.${i + 1}`}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            cart.updateQty(item.product.id, item.qty - 1)
                          }
                          className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-8 text-center text-sm font-semibold">
                          {item.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            cart.updateQty(item.product.id, item.qty + 1)
                          }
                          className="w-6 h-6 rounded bg-muted flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <div className="font-semibold text-sm text-primary">
                        {fmt(
                          item.product.salePrice *
                            item.qty *
                            (1 - item.discount / 100),
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </AnimatePresence>
          </div>
        </ScrollArea>

        {/* Totals + Checkout */}
        <div className="border-t border-border p-4 space-y-3">
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between text-muted-foreground">
              <span>Subtotal</span>
              <span>{fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>GST ({TAX_RATE}%)</span>
              <span>{fmt(taxAmt)}</span>
            </div>
            <Separator />
            <div className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span className="text-primary">{fmt(total)}</span>
            </div>
          </div>
          <Button
            className="w-full h-11 font-semibold text-base"
            disabled={cart.items.length === 0}
            onClick={() => setPaymentOpen(true)}
            data-ocid="pos.checkout.primary_button"
          >
            Checkout
          </Button>
        </div>
      </div>

      {/* Scanner Modal */}
      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={handleScan}
        title="Scan Product Barcode"
      />

      {/* Payment Modal */}
      <Dialog open={paymentOpen} onOpenChange={setPaymentOpen}>
        <DialogContent className="max-w-sm" data-ocid="pos.payment.dialog">
          {checkoutDone ? (
            <div className="text-center py-4">
              <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto mb-3" />
              <h3 className="font-display font-bold text-xl">Sale Complete!</h3>
              <p className="text-muted-foreground text-sm mt-1">
                {lastInvoiceNo}
              </p>
              <div className="flex gap-2 mt-6">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => window.print()}
                  data-ocid="pos.print.button"
                >
                  <Printer className="w-4 h-4 mr-2" /> Print
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleNewSale}
                  data-ocid="pos.newsale.primary_button"
                >
                  New Sale
                </Button>
              </div>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Payment</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <Tabs
                  value={paymentMode}
                  onValueChange={(v) =>
                    setPaymentMode(v as "cash" | "card" | "upi")
                  }
                >
                  <TabsList className="w-full">
                    <TabsTrigger
                      value="cash"
                      className="flex-1"
                      data-ocid="pos.payment.cash.tab"
                    >
                      <Banknote className="w-3.5 h-3.5 mr-1" /> Cash
                    </TabsTrigger>
                    <TabsTrigger
                      value="card"
                      className="flex-1"
                      data-ocid="pos.payment.card.tab"
                    >
                      <CreditCard className="w-3.5 h-3.5 mr-1" /> Card
                    </TabsTrigger>
                    <TabsTrigger
                      value="upi"
                      className="flex-1"
                      data-ocid="pos.payment.upi.tab"
                    >
                      <Smartphone className="w-3.5 h-3.5 mr-1" /> UPI
                    </TabsTrigger>
                  </TabsList>
                </Tabs>

                <div className="bg-muted/30 rounded-lg p-4 text-center">
                  <div className="text-sm text-muted-foreground">
                    Total Amount
                  </div>
                  <div className="font-display font-bold text-3xl text-primary">
                    {fmt(total)}
                  </div>
                </div>

                {paymentMode === "cash" && (
                  <div className="space-y-2">
                    <Label>Amount Tendered</Label>
                    <Input
                      type="number"
                      placeholder="0.00"
                      value={amountTendered}
                      onChange={(e) => setAmountTendered(e.target.value)}
                      className="text-center text-lg font-semibold"
                      data-ocid="pos.tendered.input"
                    />
                    {amountTendered && (
                      <div
                        className={cn(
                          "text-center text-sm font-semibold",
                          change >= 0 ? "text-green-500" : "text-destructive",
                        )}
                      >
                        Change: {fmt(change)}
                      </div>
                    )}
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setPaymentOpen(false)}
                    data-ocid="pos.payment.cancel_button"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCheckout}
                    disabled={createInvoice.isPending}
                    data-ocid="pos.payment.confirm_button"
                  >
                    {createInvoice.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      "Confirm Payment"
                    )}
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

import { Package } from "lucide-react";
