import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type {
  BusinessProfile,
  Expense,
  InvoiceTemplate,
  Party,
  Product,
  PurchaseBill,
  SaleInvoice,
} from "../backend.d";
import type { AppRole } from "../backend.d";
import { useActor } from "./useActor";

const toTime = (date: Date): bigint =>
  BigInt(date.getTime()) * BigInt(1_000_000);
const today = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

export function useProducts() {
  const { actor, isFetching } = useActor();
  return useQuery<Product[]>({
    queryKey: ["products"],
    queryFn: async () => (actor ? actor.listProducts() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useCreateProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (product: Product) => actor!.createProduct(product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (product: Product) => actor!.updateProduct(product),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useDeleteProduct() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => actor!.deleteProduct(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useParties() {
  const { actor, isFetching } = useActor();
  return useQuery<Party[]>({
    queryKey: ["parties"],
    queryFn: async () => (actor ? actor.listParties() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useCreateParty() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (party: Party) => actor!.createParty(party),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useUpdateParty() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (party: Party) => actor!.updateParty(party),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useDeleteParty() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => actor!.deleteParty(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["parties"] }),
  });
}

export function useSaleInvoices() {
  const { actor, isFetching } = useActor();
  return useQuery<SaleInvoice[]>({
    queryKey: ["sale-invoices"],
    queryFn: async () => (actor ? actor.listSaleInvoices() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useCreateSaleInvoice() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (inv: SaleInvoice) => actor!.createSaleInvoice(inv),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["sale-invoices"] });
      qc.invalidateQueries({ queryKey: ["daily-summary"] });
    },
  });
}

export function usePurchaseBills() {
  const { actor, isFetching } = useActor();
  return useQuery<PurchaseBill[]>({
    queryKey: ["purchase-bills"],
    queryFn: async () => (actor ? actor.listPurchaseBills() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useCreatePurchaseBill() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bill: PurchaseBill) => actor!.createPurchaseBill(bill),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["purchase-bills"] }),
  });
}

export function useExpenses() {
  const { actor, isFetching } = useActor();
  return useQuery<Expense[]>({
    queryKey: ["expenses"],
    queryFn: async () => (actor ? actor.listExpenses() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useCreateExpense() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (expense: Expense) => actor!.createExpense(expense),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["expenses"] }),
  });
}

export function useInvoiceTemplates() {
  const { actor, isFetching } = useActor();
  return useQuery<InvoiceTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => (actor ? actor.listInvoiceTemplates() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useDailySummary() {
  const { actor, isFetching } = useActor();
  return useQuery<{ invoiceCount: bigint; totalSales: number }>({
    queryKey: ["daily-summary"],
    queryFn: async () => {
      if (!actor) return { invoiceCount: BigInt(0), totalSales: 0 };
      return actor.getDailySalesSummary(toTime(today()));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useProfitLoss(startDate: Date, endDate: Date) {
  const { actor, isFetching } = useActor();
  return useQuery<{
    revenue: number;
    cost: number;
    expenses: number;
    profit: number;
  }>({
    queryKey: ["profit-loss", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!actor) return { revenue: 0, cost: 0, expenses: 0, profit: 0 };
      return actor.getProfitLoss(toTime(startDate), toTime(endDate));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useLogin() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: async ({
      username,
      password,
    }: { username: string; password: string }) => {
      if (!actor) throw new Error("Not connected");
      const a = actor as any;
      const result = await a.loginWithPassword(username, password);
      if (!result) throw new Error("Invalid username or password");
      return result as { name: string; appRole: AppRole };
    },
  });
}

export function useAppUsers() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<{ username: string; appRole: AppRole; name: string }>>({
    queryKey: ["app-users"],
    queryFn: async () => {
      if (!actor) return [];
      const a = actor as any;
      return a.listAppUsers() as Promise<
        Array<{ username: string; appRole: AppRole; name: string }>
      >;
    },
    enabled: !!actor && !isFetching,
  });
}

export function useCreateAppUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      username,
      password,
      name,
      appRole,
    }: {
      username: string;
      password: string;
      name: string;
      appRole: AppRole;
    }) => {
      const a = actor as any;
      return a.createAppUser(
        username,
        password,
        name,
        appRole,
      ) as Promise<boolean>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-users"] }),
  });
}

export function useChangePassword() {
  const { actor } = useActor();
  return useMutation({
    mutationFn: ({
      username,
      oldPassword,
      newPassword,
    }: {
      username: string;
      oldPassword: string;
      newPassword: string;
    }) => {
      const a = actor as any;
      return a.changeAppUserPassword(
        username,
        oldPassword,
        newPassword,
      ) as Promise<boolean>;
    },
  });
}

export function useDeleteAppUser() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (username: string) => {
      const a = actor as any;
      return a.deleteAppUser(username) as Promise<boolean>;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["app-users"] }),
  });
}

export function useInventoryReport() {
  const { actor, isFetching } = useActor();
  return useQuery<Array<{ value: number; product: Product }>>({
    queryKey: ["inventory-report"],
    queryFn: async () => (actor ? actor.getInventoryReport() : []),
    enabled: !!actor && !isFetching,
  });
}

export function useExpenseSummary(startDate: Date, endDate: Date) {
  const { actor, isFetching } = useActor();
  return useQuery<Array<{ total: number; category: string }>>({
    queryKey: [
      "expense-summary",
      startDate.toISOString(),
      endDate.toISOString(),
    ],
    queryFn: async () => {
      if (!actor) return [];
      return actor.getExpenseSummary(toTime(startDate), toTime(endDate));
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSalesSummary(startDate: Date, endDate: Date) {
  const { actor, isFetching } = useActor();
  return useQuery<{ invoiceCount: bigint; totalSales: number }>({
    queryKey: ["sales-summary", startDate.toISOString(), endDate.toISOString()],
    queryFn: async () => {
      if (!actor) return { invoiceCount: BigInt(0), totalSales: 0 };
      return actor.getSalesSummary(toTime(startDate), toTime(endDate));
    },
    enabled: !!actor && !isFetching,
  });
}

export function usePartyLedger(partyId: string) {
  const { actor, isFetching } = useActor();
  return useQuery<{
    invoices: SaleInvoice[];
    bills: PurchaseBill[];
    party?: Party;
  }>({
    queryKey: ["party-ledger", partyId],
    queryFn: async () => {
      if (!actor || !partyId) return { invoices: [], bills: [] };
      return actor.getPartyLedger(partyId);
    },
    enabled: !!actor && !isFetching && !!partyId,
  });
}

export function useBusinessProfile() {
  const { actor, isFetching } = useActor();
  return useQuery<BusinessProfile>({
    queryKey: ["business-profile"],
    queryFn: async () => {
      if (!actor) {
        return {
          businessName: "",
          gstNumber: "",
          address: "",
          phone: "",
          email: "",
          logoUrl: "",
          bankAccounts: [],
          upiIds: [],
        };
      }
      return actor.getBusinessProfile();
    },
    enabled: !!actor && !isFetching,
  });
}

export function useSaveBusinessProfile() {
  const { actor } = useActor();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (profile: BusinessProfile) =>
      actor!.saveBusinessProfile(profile),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["business-profile"] }),
  });
}

export { toTime };
