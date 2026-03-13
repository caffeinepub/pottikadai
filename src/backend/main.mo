import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Runtime "mo:core/Runtime";
import Order "mo:core/Order";
import Principal "mo:core/Principal";
import Timer "mo:core/Timer";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Int "mo:core/Int";
import Float "mo:core/Float";

actor {
  // File storage
  include MixinStorage();

  // Keep authorization mixin for compatibility
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Types
  type AppRole = {
    #Admin;
    #Manager;
    #Salesman;
    #Auditor;
  };

  type AppUser = {
    username : Text;
    password : Text;
    name : Text;
    appRole : AppRole;
  };

  type Product = {
    id : Text;
    name : Text;
    sku : Text;
    category : Text;
    unit : Text;
    salePrice : Float;
    purchasePrice : Float;
    stockQty : Int;
    lowStockThreshold : Int;
    isActive : Bool;
  };

  module Product {
    public func compare(a : Product, b : Product) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  type Party = {
    id : Text;
    name : Text;
    kind : { #customer; #vendor };
    phone : Text;
    email : Text;
    address : Text;
    openingBalance : Float;
    currentBalance : Float;
  };

  module Party {
    public func compare(a : Party, b : Party) : Order.Order {
      Text.compare(a.name, b.name);
    };
  };

  type SaleInvoiceItem = {
    productId : Text;
    qty : Int;
    price : Float;
    discount : Float;
  };

  type SaleInvoice = {
    id : Text;
    invoiceNumber : Text;
    date : Time.Time;
    partyId : Text;
    items : [SaleInvoiceItem];
    subtotal : Float;
    tax : Float;
    total : Float;
    paymentMode : Text;
    paidAmount : Float;
    status : Text;
    createdBy : Text;
  };

  module SaleInvoice {
    public func compare(a : SaleInvoice, b : SaleInvoice) : Order.Order {
      Int.compare(a.date, b.date);
    };
  };

  type PurchaseBill = {
    id : Text;
    billNumber : Text;
    date : Time.Time;
    partyId : Text;
    items : [SaleInvoiceItem];
    subtotal : Float;
    tax : Float;
    total : Float;
    paymentMode : Text;
    paidAmount : Float;
    status : Text;
  };

  module PurchaseBill {
    public func compare(a : PurchaseBill, b : PurchaseBill) : Order.Order {
      Int.compare(a.date, b.date);
    };
  };

  type Expense = {
    id : Text;
    date : Time.Time;
    category : Text;
    amount : Float;
    description : Text;
    createdBy : Text;
  };

  module Expense {
    public func compare(a : Expense, b : Expense) : Order.Order {
      Int.compare(a.date, b.date);
    };
  };

  type CreditNote = {
    id : Text;
    date : Time.Time;
    partyId : Text;
    amount : Float;
    reason : Text;
    linkedInvoiceId : Text;
  };

  type DebitNote = {
    id : Text;
    date : Time.Time;
    partyId : Text;
    amount : Float;
    reason : Text;
    linkedBillId : Text;
  };

  type InvoiceTemplate = {
    id : Text;
    name : Text;
    printSize : { #thermal; #a4; #a5 };
    layoutConfig : Text;
    isDefault : Bool;
  };

  type POSSession = {
    id : Text;
    date : Time.Time;
    cashierId : Text;
    openingCash : Float;
    closingCash : Float;
    totalSales : Float;
    status : Text;
  };

  // Persistent state
  // Legacy stable variable retained for upgrade compatibility
  type _LegacyUserProfile = { name : Text; appRole : AppRole };
  let userProfiles = Map.empty<Principal, _LegacyUserProfile>();
  let appUsers = Map.empty<Text, AppUser>();
  let products = Map.empty<Text, Product>();
  let parties = Map.empty<Text, Party>();
  let saleInvoices = Map.empty<Text, SaleInvoice>();
  let purchaseBills = Map.empty<Text, PurchaseBill>();
  let expenses = Map.empty<Text, Expense>();
  let creditNotes = Map.empty<Text, CreditNote>();
  let debitNotes = Map.empty<Text, DebitNote>();
  let invoiceTemplates = Map.empty<Text, InvoiceTemplate>();
  let posSessions = Map.empty<Text, POSSession>();

  // Seed default admin user on first deploy
  appUsers.add("admin", {
    username = "admin";
    password = "admin";
    name = "Administrator";
    appRole = #Admin;
  });

  // ── User Management ─────────────────────────────────────────────────────────

  public query func isFirstRun() : async Bool {
    appUsers.size() == 0
  };

  // Returns user info (no password) if credentials match
  public query func loginWithPassword(username : Text, password : Text) : async ?{ name : Text; appRole : AppRole } {
    switch (appUsers.get(username)) {
      case (null) { null };
      case (?user) {
        if (user.password == password) {
          ?{ name = user.name; appRole = user.appRole };
        } else { null };
      };
    };
  };

  public shared func createAppUser(username : Text, password : Text, name : Text, appRole : AppRole) : async Bool {
    if (appUsers.get(username) != null) { return false };
    appUsers.add(username, { username; password; name; appRole });
    true
  };

  public shared func changeAppUserPassword(username : Text, oldPassword : Text, newPassword : Text) : async Bool {
    switch (appUsers.get(username)) {
      case (null) { false };
      case (?user) {
        if (user.password != oldPassword) { return false };
        appUsers.add(username, { user with password = newPassword });
        true
      };
    };
  };

  public shared func updateAppUser(username : Text, name : Text, appRole : AppRole) : async Bool {
    switch (appUsers.get(username)) {
      case (null) { false };
      case (?user) {
        appUsers.add(username, { user with name; appRole });
        true
      };
    };
  };

  public shared func deleteAppUser(username : Text) : async Bool {
    if (appUsers.get(username) == null) { return false };
    appUsers.remove(username);
    true
  };

  public query func listAppUsers() : async [{ username : Text; name : Text; appRole : AppRole }] {
    appUsers.values().toArray().map(func(u) {
      { username = u.username; name = u.name; appRole = u.appRole }
    });
  };

  // ── Products ─────────────────────────────────────────────────────────────────

  public shared func createProduct(product : Product) : async () {
    products.add(product.id, product);
  };

  public shared func updateProduct(product : Product) : async () {
    products.add(product.id, product);
  };

  public shared func deleteProduct(id : Text) : async () {
    products.remove(id);
  };

  public query func getProduct(id : Text) : async Product {
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };
  };

  public query func listProducts() : async [Product] {
    products.values().toArray().sort();
  };

  public shared func updateStock(productId : Text, newQty : Int) : async () {
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { products.add(productId, { p with stockQty = newQty }) };
    };
  };

  // ── Parties ──────────────────────────────────────────────────────────────────

  public shared func createParty(party : Party) : async () {
    parties.add(party.id, party);
  };

  public shared func updateParty(party : Party) : async () {
    parties.add(party.id, party);
  };

  public shared func deleteParty(id : Text) : async () {
    parties.remove(id);
  };

  public query func listParties() : async [Party] {
    parties.values().toArray().sort();
  };

  public query func getParty(id : Text) : async ?Party {
    parties.get(id);
  };

  public shared func updateBalance(partyId : Text, newBalance : Float) : async () {
    switch (parties.get(partyId)) {
      case (null) { Runtime.trap("Party not found") };
      case (?p) { parties.add(partyId, { p with currentBalance = newBalance }) };
    };
  };

  // ── Sale Invoices ─────────────────────────────────────────────────────────────

  public shared func createSaleInvoice(invoice : SaleInvoice) : async () {
    saleInvoices.add(invoice.id, invoice);
  };

  public shared func updateSaleInvoice(invoice : SaleInvoice) : async () {
    saleInvoices.add(invoice.id, invoice);
  };

  public query func getSaleInvoice(id : Text) : async SaleInvoice {
    switch (saleInvoices.get(id)) {
      case (null) { Runtime.trap("Sale invoice not found") };
      case (?inv) { inv };
    };
  };

  public query func listSaleInvoices() : async [SaleInvoice] {
    saleInvoices.values().toArray().sort();
  };

  public query func listSaleInvoicesByParty(partyId : Text) : async [SaleInvoice] {
    saleInvoices.values().filter(func(inv) { inv.partyId == partyId }).toArray().sort();
  };

  public query func getDailySalesSummary(date : Time.Time) : async { totalSales : Float; invoiceCount : Nat } {
    let dayStart = (date / 86400000000000) * 86400000000000;
    let dayEnd = dayStart + 86400000000000;
    var totalSales = 0.0;
    var count = 0;
    for (inv in saleInvoices.values()) {
      if (inv.date >= dayStart and inv.date < dayEnd) {
        totalSales += inv.total;
        count += 1;
      };
    };
    { totalSales; invoiceCount = count };
  };

  // ── Purchase Bills ────────────────────────────────────────────────────────────

  public shared func createPurchaseBill(bill : PurchaseBill) : async () {
    purchaseBills.add(bill.id, bill);
  };

  public shared func updatePurchaseBill(bill : PurchaseBill) : async () {
    purchaseBills.add(bill.id, bill);
  };

  public query func getPurchaseBill(id : Text) : async ?PurchaseBill {
    purchaseBills.get(id);
  };

  public query func listPurchaseBills() : async [PurchaseBill] {
    purchaseBills.values().toArray().sort();
  };

  public query func listPurchaseBillsByParty(partyId : Text) : async [PurchaseBill] {
    purchaseBills.values().filter(func(b) { b.partyId == partyId }).toArray().sort();
  };

  // ── Expenses ──────────────────────────────────────────────────────────────────

  public shared func createExpense(expense : Expense) : async () {
    expenses.add(expense.id, expense);
  };

  public query func listExpenses() : async [Expense] {
    expenses.values().toArray().sort();
  };

  public query func listExpensesByCategory(category : Text) : async [Expense] {
    expenses.values().filter(func(e) { e.category == category }).toArray().sort();
  };

  // ── Credit / Debit Notes ──────────────────────────────────────────────────────

  public shared func createCreditNote(note : CreditNote) : async () {
    creditNotes.add(note.id, note);
  };

  public query func listCreditNotes() : async [CreditNote] {
    creditNotes.values().toArray();
  };

  public shared func createDebitNote(note : DebitNote) : async () {
    debitNotes.add(note.id, note);
  };

  public query func listDebitNotes() : async [DebitNote] {
    debitNotes.values().toArray();
  };

  // ── Invoice Templates ─────────────────────────────────────────────────────────

  public shared func createInvoiceTemplate(template : InvoiceTemplate) : async () {
    invoiceTemplates.add(template.id, template);
  };

  public shared func updateInvoiceTemplate(template : InvoiceTemplate) : async () {
    invoiceTemplates.add(template.id, template);
  };

  public shared func setDefaultTemplate(id : Text) : async () {
    for ((_, t) in invoiceTemplates.toArray().values()) {
      invoiceTemplates.add(t.id, { t with isDefault = t.id == id });
    };
  };

  public query func listInvoiceTemplates() : async [InvoiceTemplate] {
    invoiceTemplates.values().toArray();
  };

  public query func getDefaultTemplate() : async ?InvoiceTemplate {
    invoiceTemplates.values().find(func(t) { t.isDefault });
  };

  // ── POS Sessions ──────────────────────────────────────────────────────────────

  public shared func openPOSSession(session : POSSession) : async () {
    posSessions.add(session.id, session);
  };

  public shared func closePOSSession(id : Text, closingCash : Float) : async () {
    switch (posSessions.get(id)) {
      case (null) { Runtime.trap("POS session not found") };
      case (?s) { posSessions.add(id, { s with closingCash; status = "closed" }) };
    };
  };

  public query func getCurrentPOSSession() : async ?POSSession {
    posSessions.values().find(func(s) { s.status == "open" });
  };

  // ── Reports ───────────────────────────────────────────────────────────────────

  public query func getSalesSummary(startDate : Time.Time, endDate : Time.Time) : async { totalSales : Float; invoiceCount : Nat } {
    var totalSales = 0.0;
    var count = 0;
    for (inv in saleInvoices.values()) {
      if (inv.date >= startDate and inv.date <= endDate) {
        totalSales += inv.total;
        count += 1;
      };
    };
    { totalSales; invoiceCount = count };
  };

  public query func getInventoryReport() : async [{ product : Product; value : Float }] {
    products.values().toArray().map(func(p) {
      { product = p; value = p.stockQty.toFloat() * p.purchasePrice }
    });
  };

  public query func getProfitLoss(startDate : Time.Time, endDate : Time.Time) : async { revenue : Float; cost : Float; expenses : Float; profit : Float } {
    var revenue = 0.0;
    var cost = 0.0;
    var expenseTotal = 0.0;
    for (inv in saleInvoices.values()) {
      if (inv.date >= startDate and inv.date <= endDate) { revenue += inv.total };
    };
    for (bill in purchaseBills.values()) {
      if (bill.date >= startDate and bill.date <= endDate) { cost += bill.total };
    };
    for (exp in expenses.values()) {
      if (exp.date >= startDate and exp.date <= endDate) { expenseTotal += exp.amount };
    };
    { revenue; cost; expenses = expenseTotal; profit = revenue - cost - expenseTotal };
  };

  public query func getPartyLedger(partyId : Text) : async { party : ?Party; invoices : [SaleInvoice]; bills : [PurchaseBill] } {
    let party = parties.get(partyId);
    let invoices = saleInvoices.values().filter(func(inv) { inv.partyId == partyId }).toArray().sort();
    let bills = purchaseBills.values().filter(func(b) { b.partyId == partyId }).toArray().sort();
    { party; invoices; bills };
  };

  public query func getExpenseSummary(startDate : Time.Time, endDate : Time.Time) : async [{ category : Text; total : Float }] {
    let filtered = expenses.values().filter(func(e) { e.date >= startDate and e.date <= endDate });
    let categoryMap = Map.empty<Text, Float>();
    for (e in filtered) {
      let cur = switch (categoryMap.get(e.category)) { case (null) { 0.0 }; case (?v) { v } };
      categoryMap.add(e.category, cur + e.amount);
    };
    categoryMap.toArray().map<(Text, Float), { category : Text; total : Float }>(func((cat, total)) { { category = cat; total } });
  };

  // ── Admin Utilities ───────────────────────────────────────────────────────────

  public shared func clearData() : async () {
    products.clear();
    parties.clear();
    saleInvoices.clear();
    purchaseBills.clear();
    expenses.clear();
    creditNotes.clear();
    debitNotes.clear();
    invoiceTemplates.clear();
    posSessions.clear();
  };
};
