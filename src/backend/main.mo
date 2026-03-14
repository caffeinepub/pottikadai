import Text "mo:core/Text";
import Map "mo:core/Map";
import Array "mo:core/Array";
import Blob "mo:core/Blob";
import Iter "mo:core/Iter";
import Time "mo:core/Time";
import Principal "mo:core/Principal";
import Timer "mo:core/Timer";
import Storage "blob-storage/Storage";
import AccessControl "authorization/access-control";
import MixinAuthorization "authorization/MixinAuthorization";
import MixinStorage "blob-storage/Mixin";
import Migration "migration";

import Runtime "mo:core/Runtime";
import Nat "mo:core/Nat";
import Int "mo:core/Int";
import Float "mo:core/Float";
import Order "mo:core/Order";

// Apply migration for upgrade support
(with migration = Migration.run)
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
    gstRate : Float; // New field (default 0.0)
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

  type BusinessProfile = {
    businessName : Text;
    gstNumber : Text;
    address : Text;
    phone : Text;
    email : Text;
    logoUrl : Text;
    bankAccounts : [{ id : Text; bankName : Text; accountNumber : Text; ifsc : Text; accountHolder : Text }];
    upiIds : [{ id : Text; upiLabel : Text; upiId : Text; isDefault : Bool }];
  };

  // Quotation Types and Module
  type QuotationItem = {
    productId : Text;
    qty : Nat;
    price : Float;
    discount : Float;
  };

  type Quotation = {
    id : Text;
    quotationNumber : Text;
    date : Time.Time;
    partyId : Text;
    items : [QuotationItem];
    subtotal : Float;
    tax : Float;
    total : Float;
    status : Text;
    notes : Text;
    createdBy : Text;
  };

  module Quotation {
    public func compare(a : Quotation, b : Quotation) : Order.Order {
      Int.compare(a.date, b.date);
    };
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
  let quotations = Map.empty<Text, Quotation>();
  let dailyQuotationCount = Map.empty<Text, Nat>(); // New

  var businessProfile : ?BusinessProfile = null;

  // Seed default admin user on first deploy
  appUsers.add("admin", {
    username = "admin";
    password = "admin";
    name = "Administrator";
    appRole = #Admin;
  });

  // ── User Management ─────────────────────────────────────────────────────────

  public query func isFirstRun() : async Bool {
    appUsers.size() == 0;
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

  public shared ({ caller }) func createAppUser(username : Text, password : Text, name : Text, appRole : AppRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can create users");
    };
    if (appUsers.get(username) != null) { Runtime.trap("Username already exists") };
    appUsers.add(username, { username; password; name; appRole });
  };

  public shared ({ caller }) func changeAppUserPassword(username : Text, oldPassword : Text, newPassword : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can change passwords");
    };
    switch (appUsers.get(username)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        if (user.password != oldPassword) { Runtime.trap("Old password does not match") };
        appUsers.add(username, { user with password = newPassword });
      };
    };
  };

  public shared ({ caller }) func updateAppUser(username : Text, name : Text, appRole : AppRole) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can update users");
    };
    switch (appUsers.get(username)) {
      case (null) { Runtime.trap("User not found") };
      case (?user) {
        appUsers.add(username, { user with name; appRole });
      };
    };
  };

  public shared ({ caller }) func deleteAppUser(username : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can delete users");
    };
    if (appUsers.get(username) == null) { Runtime.trap("User not found") };
    appUsers.remove(username);
  };

  public query ({ caller }) func listAppUsers() : async [{ username : Text; name : Text; appRole : AppRole }] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list users");
    };
    appUsers.values().toArray().map(func(u) {
      { username = u.username; name = u.name; appRole = u.appRole };
    });
  };

  // ── Products ─────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create products");
    };
    products.add(product.id, product);
  };

  public shared ({ caller }) func updateProduct(product : Product) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update products");
    };
    products.add(product.id, product);
  };

  public shared ({ caller }) func deleteProduct(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete products");
    };
    products.remove(id);
  };

  public query ({ caller }) func getProduct(id : Text) : async Product {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view products");
    };
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { p };
    };
  };

  public query ({ caller }) func listProducts() : async [Product] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list products");
    };
    products.values().toArray().sort();
  };

  public shared ({ caller }) func updateStock(productId : Text, newQty : Int) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update stock");
    };
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?p) { products.add(productId, { p with stockQty = newQty }) };
    };
  };

  // ── Parties ──────────────────────────────────────────────────────────────────

  public shared ({ caller }) func createParty(party : Party) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create parties");
    };
    parties.add(party.id, party);
  };

  public shared ({ caller }) func updateParty(party : Party) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update parties");
    };
    parties.add(party.id, party);
  };

  public shared ({ caller }) func deleteParty(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can delete parties");
    };
    parties.remove(id);
  };

  public query ({ caller }) func listParties() : async [Party] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list parties");
    };
    parties.values().toArray().sort();
  };

  public query ({ caller }) func getParty(id : Text) : async ?Party {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view parties");
    };
    parties.get(id);
  };

  public shared ({ caller }) func updateBalance(partyId : Text, newBalance : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update balances");
    };
    switch (parties.get(partyId)) {
      case (null) { Runtime.trap("Party not found") };
      case (?p) { parties.add(partyId, { p with currentBalance = newBalance }) };
    };
  };

  // ── Sale Invoices ─────────────────────────────────────────────────────────────

  public shared ({ caller }) func createSaleInvoice(invoice : SaleInvoice) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create sale invoices");
    };
    saleInvoices.add(invoice.id, invoice);
  };

  public shared ({ caller }) func updateSaleInvoice(invoice : SaleInvoice) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update sale invoices");
    };
    saleInvoices.add(invoice.id, invoice);
  };

  public query ({ caller }) func getSaleInvoice(id : Text) : async SaleInvoice {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sale invoices");
    };
    switch (saleInvoices.get(id)) {
      case (null) { Runtime.trap("Sale invoice not found") };
      case (?inv) { inv };
    };
  };

  public query ({ caller }) func listSaleInvoices() : async [SaleInvoice] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list sale invoices");
    };
    saleInvoices.values().toArray().sort();
  };

  public query ({ caller }) func listSaleInvoicesByParty(partyId : Text) : async [SaleInvoice] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list sale invoices");
    };
    saleInvoices.values().filter(func(inv) { inv.partyId == partyId }).toArray().sort();
  };

  public query ({ caller }) func getDailySalesSummary(date : Time.Time) : async { totalSales : Float; invoiceCount : Nat } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales summary");
    };
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

  public shared ({ caller }) func createPurchaseBill(bill : PurchaseBill) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create purchase bills");
    };
    purchaseBills.add(bill.id, bill);
  };

  public shared ({ caller }) func updatePurchaseBill(bill : PurchaseBill) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update purchase bills");
    };
    purchaseBills.add(bill.id, bill);
  };

  public query ({ caller }) func getPurchaseBill(id : Text) : async ?PurchaseBill {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view purchase bills");
    };
    purchaseBills.get(id);
  };

  public query ({ caller }) func listPurchaseBills() : async [PurchaseBill] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list purchase bills");
    };
    purchaseBills.values().toArray().sort();
  };

  public query ({ caller }) func listPurchaseBillsByParty(partyId : Text) : async [PurchaseBill] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list purchase bills");
    };
    purchaseBills.values().filter(func(b) { b.partyId == partyId }).toArray().sort();
  };

  // ── Expenses ─────────────────────────────────────────────────────────────────-

  public shared ({ caller }) func createExpense(expense : Expense) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create expenses");
    };
    expenses.add(expense.id, expense);
  };

  public query ({ caller }) func listExpenses() : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list expenses");
    };
    expenses.values().toArray().sort();
  };

  public query ({ caller }) func listExpensesByCategory(category : Text) : async [Expense] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list expenses");
    };
    expenses.values().filter(func(e) { e.category == category }).toArray().sort();
  };

  // ── Credit / Debit Notes ──────────────────────────────────────────────────────

  public shared ({ caller }) func createCreditNote(note : CreditNote) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create credit notes");
    };
    creditNotes.add(note.id, note);
  };

  public query ({ caller }) func listCreditNotes() : async [CreditNote] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list credit notes");
    };
    creditNotes.values().toArray();
  };

  public shared ({ caller }) func createDebitNote(note : DebitNote) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create debit notes");
    };
    debitNotes.add(note.id, note);
  };

  public query ({ caller }) func listDebitNotes() : async [DebitNote] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list debit notes");
    };
    debitNotes.values().toArray();
  };

  // ── Invoice Templates ─────────────────────────────────────────────────────────

  public shared ({ caller }) func createInvoiceTemplate(template : InvoiceTemplate) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create invoice templates");
    };
    invoiceTemplates.add(template.id, template);
  };

  public shared ({ caller }) func updateInvoiceTemplate(template : InvoiceTemplate) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update invoice templates");
    };
    invoiceTemplates.add(template.id, template);
  };

  public shared ({ caller }) func setDefaultTemplate(id : Text) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can set default template");
    };
    for ((_, t) in invoiceTemplates.toArray().values()) {
      invoiceTemplates.add(t.id, { t with isDefault = t.id == id });
    };
  };

  public query ({ caller }) func listInvoiceTemplates() : async [InvoiceTemplate] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list invoice templates");
    };
    invoiceTemplates.values().toArray();
  };

  public query ({ caller }) func getDefaultTemplate() : async ?InvoiceTemplate {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view default template");
    };
    invoiceTemplates.values().find(func(t) { t.isDefault });
  };

  // ── POS Sessions ──────────────────────────────────────────────────────────────

  public shared ({ caller }) func openPOSSession(session : POSSession) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can open POS sessions");
    };
    posSessions.add(session.id, session);
  };

  public shared ({ caller }) func closePOSSession(id : Text, closingCash : Float) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can close POS sessions");
    };
    switch (posSessions.get(id)) {
      case (null) { Runtime.trap("POS session not found") };
      case (?s) { posSessions.add(id, { s with closingCash; status = "closed" }) };
    };
  };

  public query ({ caller }) func getCurrentPOSSession() : async ?POSSession {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view POS sessions");
    };
    posSessions.values().find(func(s) { s.status == "open" });
  };

  // ── Reports ───────────────────────────────────────────────────────────────────

  public query ({ caller }) func getSalesSummary(startDate : Time.Time, endDate : Time.Time) : async { totalSales : Float; invoiceCount : Nat } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view sales summary");
    };
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

  public query ({ caller }) func getInventoryReport() : async [{ product : Product; value : Float }] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view inventory report");
    };
    products.values().toArray().map(func(p) {
      { product = p; value = p.stockQty.toFloat() * p.purchasePrice };
    });
  };

  public query ({ caller }) func getProfitLoss(startDate : Time.Time, endDate : Time.Time) : async { revenue : Float; cost : Float; expenses : Float; profit : Float } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view profit/loss report");
    };
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

  public query ({ caller }) func getPartyLedger(partyId : Text) : async { party : ?Party; invoices : [SaleInvoice]; bills : [PurchaseBill] } {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view party ledger");
    };
    let party = parties.get(partyId);
    let invoices = saleInvoices.values().filter(func(inv) { inv.partyId == partyId }).toArray().sort();
    let bills = purchaseBills.values().filter(func(b) { b.partyId == partyId }).toArray().sort();
    { party; invoices; bills };
  };

  public query ({ caller }) func getExpenseSummary(startDate : Time.Time, endDate : Time.Time) : async [{ category : Text; total : Float }] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view expense summary");
    };
    let filtered = expenses.values().filter(func(e) { e.date >= startDate and e.date <= endDate });
    let categoryMap = Map.empty<Text, Float>();
    for (e in filtered) {
      let cur = switch (categoryMap.get(e.category)) { case (null) { 0.0 }; case (?v) { v } };
      categoryMap.add(e.category, cur + e.amount);
    };
    categoryMap.toArray().map<(Text, Float), { category : Text; total : Float }>(func((cat, total)) { { category = cat; total } });
  };

  // ── Admin Utilities ───────────────────────────────────────────────────────────

  public shared ({ caller }) func clearData() : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can clear data");
    };
    products.clear();
    parties.clear();
    saleInvoices.clear();
    purchaseBills.clear();
    expenses.clear();
    creditNotes.clear();
    debitNotes.clear();
    invoiceTemplates.clear();
    posSessions.clear();
    quotations.clear();
    dailyQuotationCount.clear();
  };

  // ── Business Profile Management ───────────────────────────────────────────────

  public query ({ caller }) func getBusinessProfile() : async BusinessProfile {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view business profile");
    };
    switch (businessProfile) {
      case (?profile) { profile };
      case (null) {
        {
          businessName = "";
          gstNumber = "";
          address = "";
          phone = "";
          email = "";
          logoUrl = "";
          bankAccounts = [];
          upiIds = [];
        };
      };
    };
  };

  public shared ({ caller }) func saveBusinessProfile(profile : BusinessProfile) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #admin))) {
      Runtime.trap("Unauthorized: Only admins can save business profile");
    };
    businessProfile := ?profile;
  };

  // ── Quotations Management ─────────────────────────────────────────────────────

  public shared ({ caller }) func createQuotation(quotation : Quotation) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can create quotations");
    };

    // Increment daily counter and generate quotation number
    let dateStr = quotation.date.toText();
    let count = switch (dailyQuotationCount.get(dateStr)) {
      case (null) {
        dailyQuotationCount.add(dateStr, 1);
        1;
      };
      case (?existing) {
        dailyQuotationCount.add(dateStr, existing + 1);
        existing + 1;
      };
    };

    let quotationNumber = "Q-" # dateStr # "-" # count.toText();
    let newQuotation = { quotation with quotationNumber };

    quotations.add(quotation.id, newQuotation);
  };

  public shared ({ caller }) func updateQuotation(quotation : Quotation) : async () {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can update quotations");
    };
    quotations.add(quotation.id, quotation);
  };

  public query ({ caller }) func listQuotations() : async [Quotation] {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can list quotations");
    };
    quotations.values().toArray().sort();
  };

  public query ({ caller }) func getQuotation(id : Text) : async ?Quotation {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view quotations");
    };
    quotations.get(id);
  };

  public query ({ caller }) func getDailyQuotationCount(dateStr : Text) : async Nat {
    if (not (AccessControl.hasPermission(accessControlState, caller, #user))) {
      Runtime.trap("Unauthorized: Only users can view daily quotation count");
    };
    switch (dailyQuotationCount.get(dateStr)) {
      case (null) { 0 };
      case (?count) { count };
    };
  };
};
