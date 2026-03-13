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
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Edit2,
  Loader2,
  Plus,
  Search,
  Trash2,
  TrendingDown,
  TrendingUp,
  Users,
} from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Party } from "../backend.d";
import { Variant_customer_vendor } from "../backend.d";
import {
  useCreateParty,
  useDeleteParty,
  useParties,
  useUpdateParty,
} from "../hooks/useQueries";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);

const emptyParty = (kind: Variant_customer_vendor): Omit<Party, "id"> => ({
  name: "",
  email: "",
  phone: "",
  address: "",
  openingBalance: 0,
  currentBalance: 0,
  kind,
});

export function Parties() {
  const { data: parties, isLoading } = useParties();
  const createParty = useCreateParty();
  const updateParty = useUpdateParty();
  const deleteParty = useDeleteParty();

  const [tab, setTab] = useState<"customer" | "vendor">("customer");
  const [search, setSearch] = useState("");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editParty, setEditParty] = useState<Party | null>(null);
  const [form, setForm] = useState<Omit<Party, "id">>(
    emptyParty(Variant_customer_vendor.customer),
  );
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return (parties ?? []).filter((p) => {
      const matchTab = p.kind === tab;
      const matchSearch =
        !search ||
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.phone.includes(search);
      return matchTab && matchSearch;
    });
  }, [parties, tab, search]);

  const openAdd = () => {
    setEditParty(null);
    setForm(
      emptyParty(
        tab === "customer"
          ? Variant_customer_vendor.customer
          : Variant_customer_vendor.vendor,
      ),
    );
    setSheetOpen(true);
  };

  const openEdit = (p: Party) => {
    setEditParty(p);
    setForm({ ...p });
    setSheetOpen(true);
  };

  const handleSave = async () => {
    if (!form.name) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editParty) {
        await updateParty.mutateAsync({ ...form, id: editParty.id });
        toast.success("Party updated");
      } else {
        await createParty.mutateAsync({ ...form, id: crypto.randomUUID() });
        toast.success("Party created");
      }
      setSheetOpen(false);
    } catch {
      toast.error("Failed to save");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteParty.mutateAsync(deleteId);
      toast.success("Party deleted");
      setDeleteId(null);
    } catch {
      toast.error("Failed to delete");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="parties.page">
      <Tabs
        value={tab}
        onValueChange={(v) => setTab(v as "customer" | "vendor")}
      >
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="customer" data-ocid="parties.customer.tab">
              Customers
            </TabsTrigger>
            <TabsTrigger value="vendor" data-ocid="parties.vendor.tab">
              Vendors
            </TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 w-52"
                placeholder="Search..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                data-ocid="parties.search_input"
              />
            </div>
            <Button onClick={openAdd} data-ocid="parties.add.primary_button">
              <Plus className="w-4 h-4 mr-2" /> Add{" "}
              {tab === "customer" ? "Customer" : "Vendor"}
            </Button>
          </div>
        </div>
      </Tabs>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="parties.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="parties.empty_state"
        >
          <Users className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No {tab}s found</p>
          <Button className="mt-4" onClick={openAdd}>
            Add {tab === "customer" ? "Customer" : "Vendor"}
          </Button>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((party, i) => (
            <motion.div
              key={party.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <div
                className="bg-card border border-border rounded-xl p-4 hover:border-primary/30 transition-colors"
                data-ocid={`parties.party.card.${i + 1}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-semibold">{party.name}</div>
                    <div className="text-sm text-muted-foreground mt-0.5">
                      {party.phone || party.email || "—"}
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7"
                      onClick={() => openEdit(party)}
                      data-ocid={`parties.party.edit_button.${i + 1}`}
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-7 h-7 hover:text-destructive"
                      onClick={() => setDeleteId(party.id)}
                      data-ocid={`parties.party.delete_button.${i + 1}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                <div className="mt-3 flex items-center gap-1">
                  {party.currentBalance >= 0 ? (
                    <TrendingUp className="w-4 h-4 text-green-500" />
                  ) : (
                    <TrendingDown className="w-4 h-4 text-destructive" />
                  )}
                  <span
                    className={cn(
                      "font-semibold text-sm",
                      party.currentBalance >= 0
                        ? "text-green-500"
                        : "text-destructive",
                    )}
                  >
                    {fmt(Math.abs(party.currentBalance))}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {party.currentBalance >= 0 ? "credit" : "debit"}
                  </span>
                </div>
                {party.address && (
                  <div className="text-xs text-muted-foreground mt-2 truncate">
                    {party.address}
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-md"
          data-ocid="parties.party.sheet"
        >
          <SheetHeader>
            <SheetTitle className="font-display">
              {editParty
                ? "Edit Party"
                : `Add ${tab === "customer" ? "Customer" : "Vendor"}`}
            </SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={form.name}
                onChange={(e) =>
                  setForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="Full name"
                data-ocid="parties.name.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) =>
                  setForm((f) => ({ ...f, phone: e.target.value }))
                }
                placeholder="+91 XXXXX XXXXX"
                data-ocid="parties.phone.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) =>
                  setForm((f) => ({ ...f, email: e.target.value }))
                }
                placeholder="email@example.com"
                data-ocid="parties.email.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Address</Label>
              <Input
                value={form.address}
                onChange={(e) =>
                  setForm((f) => ({ ...f, address: e.target.value }))
                }
                placeholder="Street, City, State"
                data-ocid="parties.address.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Opening Balance (₹)</Label>
              <Input
                type="number"
                value={form.openingBalance}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    openingBalance: Number(e.target.value),
                  }))
                }
                data-ocid="parties.openingbalance.input"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
                data-ocid="parties.sheet.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleSave}
                disabled={createParty.isPending || updateParty.isPending}
                data-ocid="parties.sheet.save_button"
              >
                {createParty.isPending || updateParty.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editParty ? (
                  "Update"
                ) : (
                  "Create"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={!!deleteId}
        onOpenChange={(o) => !o && setDeleteId(null)}
      >
        <AlertDialogContent data-ocid="parties.delete.dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Party?</AlertDialogTitle>
            <AlertDialogDescription>
              This will remove the party and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-ocid="parties.delete.cancel_button">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive"
              data-ocid="parties.delete.confirm_button"
            >
              {deleteParty.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
