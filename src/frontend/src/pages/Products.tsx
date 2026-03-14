import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
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
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  Edit2,
  Loader2,
  Package,
  Plus,
  ScanLine,
  Search,
  Trash2,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Product } from "../backend.d";
import { BarcodeGenerator } from "../components/BarcodeGenerator";
import { BarcodeScannerModal } from "../components/BarcodeScannerModal";
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "../hooks/useQueries";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const CATEGORIES = [
  "Electronics",
  "Clothing",
  "Food & Beverage",
  "Hardware",
  "Cosmetics",
  "Stationery",
  "Other",
];
const UNITS = ["pcs", "kg", "g", "litre", "ml", "box", "set", "pair"];
const GST_RATES = [0, 5, 12, 18, 28];

const emptyProduct = (): Omit<Product, "id"> => ({
  name: "",
  sku: "",
  category: "",
  unit: "pcs",
  salePrice: 0,
  purchasePrice: 0,
  stockQty: BigInt(0),
  lowStockThreshold: BigInt(5),
  isActive: true,
  gstRate: 0,
});

export function Products() {
  const { data: products, isLoading } = useProducts();
  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editProduct, setEditProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<Omit<Product, "id">>(emptyProduct());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("details");

  const filtered = useMemo(() => {
    return (products ?? []).filter((p) => {
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.category.toLowerCase().includes(search.toLowerCase());
      const matchFilter =
        filter === "all" ||
        (filter === "low-stock" && p.stockQty <= p.lowStockThreshold) ||
        (filter === "active" && p.isActive) ||
        (filter === "inactive" && !p.isActive);
      return matchSearch && matchFilter;
    });
  }, [products, search, filter]);

  const openAdd = () => {
    setEditProduct(null);
    setForm(emptyProduct());
    setActiveTab("details");
    setSheetOpen(true);
  };

  const openEdit = (p: Product) => {
    setEditProduct(p);
    setForm({ ...p });
    setActiveTab("details");
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.sku) {
      toast.error("Name and SKU are required");
      return;
    }
    try {
      if (editProduct) {
        await updateProduct.mutateAsync({ ...form, id: editProduct.id });
        toast.success("Product updated");
      } else {
        await createProduct.mutateAsync({ ...form, id: crypto.randomUUID() });
        toast.success("Product created");
      }
      setSheetOpen(false);
    } catch {
      toast.error("Failed to save product");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteProduct.mutateAsync(deleteId);
      toast.success("Product deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="products.page">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search products..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              data-ocid="products.search_input"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setScannerOpen(true)}
            data-ocid="products.scan.button"
          >
            <ScanLine className="w-4 h-4" />
          </Button>
        </div>
        <div className="flex gap-2">
          <Select value={filter} onValueChange={setFilter}>
            <SelectTrigger className="w-36" data-ocid="products.filter.select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Products</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
              <SelectItem value="low-stock">Low Stock</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={openAdd} data-ocid="products.add.primary_button">
            <Plus className="w-4 h-4 mr-2" /> Add Product
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="products.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="products.empty_state"
        >
          <Package className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No products found</p>
          <p className="text-sm mt-1">Add your first product to get started</p>
          <Button className="mt-4" onClick={openAdd}>
            Add Product
          </Button>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="rounded-xl border border-border overflow-hidden"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30">
                  <TableHead>Product</TableHead>
                  <TableHead className="hidden sm:table-cell">SKU</TableHead>
                  <TableHead className="hidden md:table-cell">
                    Category
                  </TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Sale Price</TableHead>
                  <TableHead className="hidden lg:table-cell">
                    Purchase Price
                  </TableHead>
                  <TableHead className="hidden md:table-cell">GST</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p, i) => {
                  const isLow = p.stockQty <= p.lowStockThreshold;
                  return (
                    <TableRow
                      key={p.id}
                      className="hover:bg-muted/20"
                      data-ocid={`products.product.row.${i + 1}`}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0">
                            <Package className="w-4 h-4 text-muted-foreground" />
                          </div>
                          <span className="font-medium text-sm">{p.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="hidden sm:table-cell font-mono text-xs text-muted-foreground">
                        {p.sku}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline" className="text-xs">
                          {p.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {isLow && (
                            <AlertTriangle className="w-3 h-3 text-destructive" />
                          )}
                          <span
                            className={cn(
                              "text-sm font-medium",
                              isLow && "text-destructive",
                            )}
                          >
                            {String(p.stockQty)} {p.unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {fmt(p.salePrice)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell text-muted-foreground">
                        {fmt(p.purchasePrice)}
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs font-mono",
                            p.gstRate === 0
                              ? "text-muted-foreground"
                              : "text-primary border-primary/30",
                          )}
                        >
                          {p.gstRate}%
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.isActive ? "default" : "secondary"}>
                          {p.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7"
                            onClick={() => openEdit(p)}
                            data-ocid={`products.product.edit_button.${i + 1}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 hover:text-destructive"
                            onClick={() => setDeleteId(p.id)}
                            data-ocid={`products.product.delete_button.${i + 1}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </motion.div>
      )}

      {/* Add/Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-lg overflow-y-auto"
          data-ocid="products.product.sheet"
        >
          <SheetHeader>
            <SheetTitle className="font-display">
              {editProduct ? "Edit Product" : "Add Product"}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="w-full">
                <TabsTrigger
                  value="details"
                  className="flex-1"
                  data-ocid="products.sheet.details.tab"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="barcode"
                  className="flex-1"
                  data-ocid="products.sheet.barcode.tab"
                >
                  Barcode
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {activeTab === "details" && (
              <div className="mt-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="col-span-2 space-y-1">
                    <Label>Product Name *</Label>
                    <Input
                      value={form.name}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, name: e.target.value }))
                      }
                      placeholder="e.g., Samsung Galaxy S24"
                      data-ocid="products.name.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>SKU *</Label>
                    <Input
                      value={form.sku}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, sku: e.target.value }))
                      }
                      placeholder="e.g., SKU-001"
                      data-ocid="products.sku.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Unit</Label>
                    <Select
                      value={form.unit}
                      onValueChange={(v) => setForm((f) => ({ ...f, unit: v }))}
                    >
                      <SelectTrigger data-ocid="products.unit.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {UNITS.map((u) => (
                          <SelectItem key={u} value={u}>
                            {u}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Category</Label>
                    <Select
                      value={form.category}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, category: v }))
                      }
                    >
                      <SelectTrigger data-ocid="products.category.select">
                        <SelectValue placeholder="Select" />
                      </SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => (
                          <SelectItem key={c} value={c}>
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>GST Rate</Label>
                    <Select
                      value={String(form.gstRate)}
                      onValueChange={(v) =>
                        setForm((f) => ({ ...f, gstRate: Number(v) }))
                      }
                    >
                      <SelectTrigger data-ocid="products.gst.select">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {GST_RATES.map((r) => (
                          <SelectItem key={r} value={String(r)}>
                            {r}%
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Sale Price (₹)</Label>
                    <Input
                      type="number"
                      value={form.salePrice}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          salePrice: Number(e.target.value),
                        }))
                      }
                      data-ocid="products.saleprice.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Purchase Price (₹)</Label>
                    <Input
                      type="number"
                      value={form.purchasePrice}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          purchasePrice: Number(e.target.value),
                        }))
                      }
                      data-ocid="products.purchaseprice.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Stock Qty</Label>
                    <Input
                      type="number"
                      value={String(form.stockQty)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          stockQty: BigInt(Math.max(0, Number(e.target.value))),
                        }))
                      }
                      data-ocid="products.stock.input"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label>Low Stock Alert</Label>
                    <Input
                      type="number"
                      value={String(form.lowStockThreshold)}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          lowStockThreshold: BigInt(
                            Math.max(0, Number(e.target.value)),
                          ),
                        }))
                      }
                      data-ocid="products.lowstock.input"
                    />
                  </div>
                  <div className="col-span-2 flex items-center gap-3">
                    <Switch
                      checked={form.isActive}
                      onCheckedChange={(v) =>
                        setForm((f) => ({ ...f, isActive: v }))
                      }
                      data-ocid="products.active.switch"
                    />
                    <Label>Active</Label>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setSheetOpen(false)}
                    data-ocid="products.sheet.cancel_button"
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleSave}
                    disabled={
                      createProduct.isPending || updateProduct.isPending
                    }
                    data-ocid="products.sheet.save_button"
                  >
                    {createProduct.isPending || updateProduct.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : editProduct ? (
                      "Update"
                    ) : (
                      "Create"
                    )}
                  </Button>
                </div>
              </div>
            )}

            {activeTab === "barcode" && (
              <div className="mt-6 flex flex-col items-center space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Barcode generated from SKU:{" "}
                  <span className="font-mono font-semibold">
                    {form.sku || "(enter SKU)"}
                  </span>
                </p>
                <BarcodeGenerator
                  value={form.sku}
                  label={form.name}
                  showControls
                />
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="products.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Product?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="products.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-ocid="products.delete.confirm_button"
            >
              {deleteProduct.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <BarcodeScannerModal
        open={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScan={(val) => {
          setSearch(val);
          setScannerOpen(false);
        }}
        title="Search by Barcode"
      />
    </div>
  );
}
