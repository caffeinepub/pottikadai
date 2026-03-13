import type { Principal } from "@icp-sdk/core/principal";
export interface Some<T> {
    __kind__: "Some";
    value: T;
}
export interface None {
    __kind__: "None";
}
export type Option<T> = Some<T> | None;
export interface DebitNote {
    id: string;
    date: Time;
    linkedBillId: string;
    amount: number;
    partyId: string;
    reason: string;
}
export type Time = bigint;
export interface Expense {
    id: string;
    date: Time;
    createdBy: string;
    description: string;
    category: string;
    amount: number;
}
export interface POSSession {
    id: string;
    status: string;
    cashierId: string;
    date: Time;
    openingCash: number;
    totalSales: number;
    closingCash: number;
}
export interface SaleInvoice {
    id: string;
    tax: number;
    status: string;
    total: number;
    date: Time;
    createdBy: string;
    invoiceNumber: string;
    paymentMode: string;
    items: Array<SaleInvoiceItem>;
    paidAmount: number;
    partyId: string;
    subtotal: number;
}
export interface Party {
    id: string;
    currentBalance: number;
    kind: Variant_customer_vendor;
    name: string;
    email: string;
    address: string;
    openingBalance: number;
    phone: string;
}
export interface CreditNote {
    id: string;
    linkedInvoiceId: string;
    date: Time;
    amount: number;
    partyId: string;
    reason: string;
}
export interface PurchaseBill {
    id: string;
    tax: number;
    status: string;
    total: number;
    date: Time;
    billNumber: string;
    paymentMode: string;
    items: Array<SaleInvoiceItem>;
    paidAmount: number;
    partyId: string;
    subtotal: number;
}
export interface InvoiceTemplate {
    id: string;
    name: string;
    isDefault: boolean;
    printSize: Variant_a4_a5_thermal;
    layoutConfig: string;
}
export interface SaleInvoiceItem {
    qty: bigint;
    productId: string;
    discount: number;
    price: number;
}
export interface Product {
    id: string;
    sku: string;
    purchasePrice: number;
    lowStockThreshold: bigint;
    stockQty: bigint;
    name: string;
    unit: string;
    isActive: boolean;
    category: string;
    salePrice: number;
}
export interface AppUser {
    username: string;
    name: string;
    appRole: AppRole;
}
export enum AppRole {
    Auditor = "Auditor",
    Admin = "Admin",
    Manager = "Manager",
    Salesman = "Salesman"
}
export enum UserRole {
    admin = "admin",
    user = "user",
    guest = "guest"
}
export enum Variant_a4_a5_thermal {
    a4 = "a4",
    a5 = "a5",
    thermal = "thermal"
}
export enum Variant_customer_vendor {
    customer = "customer",
    vendor = "vendor"
}
export interface backendInterface {
    // Auth
    isFirstRun(): Promise<boolean>;
    loginWithPassword(username: string, password: string): Promise<{ name: string; appRole: AppRole } | null>;
    createAppUser(username: string, password: string, name: string, appRole: AppRole): Promise<boolean>;
    changeAppUserPassword(username: string, oldPassword: string, newPassword: string): Promise<boolean>;
    updateAppUser(username: string, name: string, appRole: AppRole): Promise<boolean>;
    deleteAppUser(username: string): Promise<boolean>;
    listAppUsers(): Promise<Array<AppUser>>;
    // Authorization compat
    _initializeAccessControlWithSecret(secret: string): Promise<void>;
    assignCallerUserRole(user: Principal, role: UserRole): Promise<void>;
    getCallerUserRole(): Promise<UserRole>;
    isCallerAdmin(): Promise<boolean>;
    // Data
    clearData(): Promise<void>;
    closePOSSession(id: string, closingCash: number): Promise<void>;
    createCreditNote(note: CreditNote): Promise<void>;
    createDebitNote(note: DebitNote): Promise<void>;
    createExpense(expense: Expense): Promise<void>;
    createInvoiceTemplate(template: InvoiceTemplate): Promise<void>;
    createParty(party: Party): Promise<void>;
    createProduct(product: Product): Promise<void>;
    createPurchaseBill(bill: PurchaseBill): Promise<void>;
    createSaleInvoice(invoice: SaleInvoice): Promise<void>;
    deleteParty(id: string): Promise<void>;
    deleteProduct(id: string): Promise<void>;
    getCurrentPOSSession(): Promise<POSSession | null>;
    getDailySalesSummary(date: Time): Promise<{ invoiceCount: bigint; totalSales: number }>;
    getDefaultTemplate(): Promise<InvoiceTemplate | null>;
    getExpenseSummary(startDate: Time, endDate: Time): Promise<Array<{ total: number; category: string }>>;
    getInventoryReport(): Promise<Array<{ value: number; product: Product }>>;
    getParty(id: string): Promise<Party | null>;
    getPartyLedger(partyId: string): Promise<{ invoices: Array<SaleInvoice>; bills: Array<PurchaseBill>; party?: Party }>;
    getProduct(id: string): Promise<Product>;
    getProfitLoss(startDate: Time, endDate: Time): Promise<{ revenue: number; cost: number; expenses: number; profit: number }>;
    getPurchaseBill(id: string): Promise<PurchaseBill | null>;
    getSaleInvoice(id: string): Promise<SaleInvoice>;
    getSalesSummary(startDate: Time, endDate: Time): Promise<{ invoiceCount: bigint; totalSales: number }>;
    listCreditNotes(): Promise<Array<CreditNote>>;
    listDebitNotes(): Promise<Array<DebitNote>>;
    listExpenses(): Promise<Array<Expense>>;
    listExpensesByCategory(category: string): Promise<Array<Expense>>;
    listInvoiceTemplates(): Promise<Array<InvoiceTemplate>>;
    listParties(): Promise<Array<Party>>;
    listProducts(): Promise<Array<Product>>;
    listPurchaseBills(): Promise<Array<PurchaseBill>>;
    listPurchaseBillsByParty(partyId: string): Promise<Array<PurchaseBill>>;
    listSaleInvoices(): Promise<Array<SaleInvoice>>;
    listSaleInvoicesByParty(partyId: string): Promise<Array<SaleInvoice>>;
    openPOSSession(session: POSSession): Promise<void>;
    setDefaultTemplate(id: string): Promise<void>;
    updateBalance(partyId: string, newBalance: number): Promise<void>;
    updateInvoiceTemplate(template: InvoiceTemplate): Promise<void>;
    updateParty(party: Party): Promise<void>;
    updateProduct(product: Product): Promise<void>;
    updatePurchaseBill(bill: PurchaseBill): Promise<void>;
    updateSaleInvoice(invoice: SaleInvoice): Promise<void>;
    updateStock(productId: string, newQty: bigint): Promise<void>;
}
