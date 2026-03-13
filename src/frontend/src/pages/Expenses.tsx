import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { CreditCard, Loader2, Plus, Search } from "lucide-react";
import { motion } from "motion/react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Expense } from "../backend.d";
import { useCreateExpense, useExpenses } from "../hooks/useQueries";

const fmt = (n: number) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(n);
const toDate = (t: bigint) =>
  new Date(Number(t / BigInt(1_000_000))).toLocaleDateString("en-IN");

const EXPENSE_CATEGORIES = [
  "Rent",
  "Salaries",
  "Utilities",
  "Transport",
  "Marketing",
  "Supplies",
  "Maintenance",
  "Other",
];

export function Expenses() {
  const { data: expenses, isLoading } = useExpenses();
  const createExpense = useCreateExpense();

  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [form, setForm] = useState({
    category: "",
    amount: 0,
    description: "",
    date: new Date().toISOString().split("T")[0],
  });

  const filtered = useMemo(() => {
    return (expenses ?? [])
      .filter((e) => {
        const matchSearch =
          !search ||
          e.description.toLowerCase().includes(search.toLowerCase()) ||
          e.category.toLowerCase().includes(search.toLowerCase());
        const matchCat =
          categoryFilter === "all" || e.category === categoryFilter;
        return matchSearch && matchCat;
      })
      .sort((a, b) => Number(b.date - a.date));
  }, [expenses, search, categoryFilter]);

  const totalExpenses = useMemo(
    () => filtered.reduce((s, e) => s + e.amount, 0),
    [filtered],
  );

  const handleCreate = async () => {
    if (!form.category || !form.amount) {
      toast.error("Category and amount are required");
      return;
    }
    try {
      const expense: Expense = {
        id: crypto.randomUUID(),
        category: form.category,
        amount: form.amount,
        description: form.description,
        date: BigInt(new Date(form.date).getTime()) * BigInt(1_000_000),
        createdBy: "",
      };
      await createExpense.mutateAsync(expense);
      toast.success("Expense recorded");
      setSheetOpen(false);
      setForm({
        category: "",
        amount: 0,
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
    } catch {
      toast.error("Failed to save expense");
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-4" data-ocid="expenses.page">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="bg-primary/10 border border-primary/20 rounded-xl px-4 py-3">
          <div className="text-xs text-muted-foreground">Total Expenses</div>
          <div className="font-display font-bold text-xl text-primary">
            {fmt(totalExpenses)}
          </div>
        </div>
        <Button
          onClick={() => setSheetOpen(true)}
          data-ocid="expenses.add.primary_button"
        >
          <Plus className="w-4 h-4 mr-2" /> Add Expense
        </Button>
      </div>

      <div className="flex gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            data-ocid="expenses.search_input"
          />
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40" data-ocid="expenses.category.select">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {EXPENSE_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div
          className="flex items-center justify-center py-16"
          data-ocid="expenses.loading_state"
        >
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div
          className="text-center py-16 text-muted-foreground"
          data-ocid="expenses.empty_state"
        >
          <CreditCard className="w-12 h-12 mx-auto mb-3 opacity-20" />
          <p className="font-medium">No expenses recorded</p>
          <Button className="mt-4" onClick={() => setSheetOpen(true)}>
            Add Expense
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
                <TableHead>Date</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Description</TableHead>
                <TableHead className="text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((exp, i) => (
                <TableRow
                  key={exp.id}
                  className="hover:bg-muted/20"
                  data-ocid={`expenses.expense.row.${i + 1}`}
                >
                  <TableCell className="text-sm text-muted-foreground">
                    {toDate(exp.date)}
                  </TableCell>
                  <TableCell>
                    <span className="text-xs font-medium bg-accent/20 text-accent-foreground px-2 py-0.5 rounded">
                      {exp.category}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {exp.description || "—"}
                  </TableCell>
                  <TableCell className="text-right font-semibold text-destructive">
                    {fmt(exp.amount)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent
          className="w-full sm:max-w-md"
          data-ocid="expenses.expense.sheet"
        >
          <SheetHeader>
            <SheetTitle className="font-display">Add Expense</SheetTitle>
          </SheetHeader>
          <div className="mt-4 space-y-3">
            <div className="space-y-1">
              <Label>Category *</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}
              >
                <SelectTrigger data-ocid="expenses.category.form.select">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Amount (₹) *</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: Number(e.target.value) }))
                }
                data-ocid="expenses.amount.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Date</Label>
              <Input
                type="date"
                value={form.date}
                onChange={(e) =>
                  setForm((f) => ({ ...f, date: e.target.value }))
                }
                data-ocid="expenses.date.input"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Notes..."
                rows={3}
                data-ocid="expenses.description.textarea"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setSheetOpen(false)}
                data-ocid="expenses.sheet.cancel_button"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                onClick={handleCreate}
                disabled={createExpense.isPending}
                data-ocid="expenses.sheet.save_button"
              >
                {createExpense.isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Save Expense"
                )}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
