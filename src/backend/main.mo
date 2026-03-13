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
  // File storage (blob references for images/docs)
  include MixinStorage();

  // Types
  type AppRole = {
    #Admin;
    #Manager;
    #Salesman;
    #Auditor;
  };

  type UserProfile = {
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
    kind : {
      #customer;
      #vendor;
    };
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
    printSize : {
      #thermal;
      #a4;
      #a5;
    };
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

  type TemplateLayout = {
    header : Text;
    items : Text;
    total : Text;
    footer : Text;
  };

  // Persistent state
  let products = Map.empty<Text, Product>();
  let parties = Map.empty<Text, Party>();
  let saleInvoices = Map.empty<Text, SaleInvoice>();
  let purchaseBills = Map.empty<Text, PurchaseBill>();
  let expenses = Map.empty<Text, Expense>();
  let creditNotes = Map.empty<Text, CreditNote>();
  let debitNotes = Map.empty<Text, DebitNote>();
  let invoiceTemplates = Map.empty<Text, InvoiceTemplate>();
  let posSessions = Map.empty<Text, POSSession>();
  let userProfiles = Map.empty<Principal, UserProfile>();

  // Authorization
  let accessControlState = AccessControl.initState();
  include MixinAuthorization(accessControlState);

  // Helper functions for app-level role checks
  func getAppRole(caller : Principal) : ?AppRole {
    switch (userProfiles.get(caller)) {
      case (null) { null };
      case (?profile) { ?profile.appRole };
    };
  };

  func hasAppRole(caller : Principal, requiredRole : AppRole) : Bool {
    if (AccessControl.isAdmin(accessControlState, caller)) {
      return true;
    };
    switch (getAppRole(caller)) {
      case (null) { false };
      case (?role) {
        switch (requiredRole, role) {
          case (#Admin, #Admin) { true };
          case (#Manager, #Manager) { true };
          case (#Manager, #Admin) { true };
          case (#Salesman, #Salesman) { true };
          case (#Salesman, #Manager) { true };
          case (#Salesman, #Admin) { true };
          case (#Auditor, #Auditor) { true };
          case (#Auditor, #Admin) { true };
          case _ { false };
        };
      };
    };
  };

  func canWrite(caller : Principal) : Bool {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      return false;
    };
    switch (getAppRole(caller)) {
      case (null) { false };
      case (?#Auditor) { false };
      case _ { true };
    };
  };

  // User Profile Management
  public query ({ caller }) func getCallerUserProfile() : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    userProfiles.get(caller);
  };

  public query ({ caller }) func getUserProfile(user : Principal) : async ?UserProfile {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profiles");
    };
    if (caller != user and not AccessControl.isAdmin(accessControlState, caller)) {
      Runtime.trap("Unauthorized: Can only view your own profile");
    };
    userProfiles.get(user);
  };

  public shared ({ caller }) func saveCallerUserProfile(profile : UserProfile) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can save profiles");
    };
    userProfiles.add(caller, profile);
  };

  // Products - Admin and Manager can create/update
  public shared ({ caller }) func createProduct(product : Product) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create products");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can create products");
    };
    products.add(product.id, product);
  };

  public shared ({ caller }) func updateProduct(product : Product) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update products");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can update products");
    };
    products.add(product.id, product);
  };

  public shared ({ caller }) func deleteProduct(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete products");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can delete products");
    };
    products.remove(id);
  };

  public query ({ caller }) func getProduct(id : Text) : async Product {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view products");
    };
    switch (products.get(id)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) { product };
    };
  };

  public query ({ caller }) func listProducts() : async [Product] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list products");
    };
    products.values().toArray().sort();
  };

  public shared ({ caller }) func updateStock(productId : Text, newQty : Int) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update stock");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can update stock");
    };
    switch (products.get(productId)) {
      case (null) { Runtime.trap("Product not found") };
      case (?product) {
        products.add(productId, { product with stockQty = newQty });
      };
    };
  };

  // Parties - Admin and Manager can create/update
  public shared ({ caller }) func createParty(party : Party) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create parties");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can create parties");
    };
    parties.add(party.id, party);
  };

  public shared ({ caller }) func updateParty(party : Party) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update parties");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can update parties");
    };
    parties.add(party.id, party);
  };

  public shared ({ caller }) func deleteParty(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can delete parties");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can delete parties");
    };
    parties.remove(id);
  };

  public query ({ caller }) func listParties() : async [Party] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list parties");
    };
    parties.values().toArray().sort();
  };

  public query ({ caller }) func getParty(id : Text) : async ?Party {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view parties");
    };
    parties.get(id);
  };

  public shared ({ caller }) func updateBalance(partyId : Text, newBalance : Float) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update balance");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can update balance");
    };
    switch (parties.get(partyId)) {
      case (null) { Runtime.trap("Party not found") };
      case (?party) {
        parties.add(partyId, { party with currentBalance = newBalance });
      };
    };
  };

  // Sale Invoices - All non-Auditor users can create
  public shared ({ caller }) func createSaleInvoice(invoice : SaleInvoice) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create sale invoices");
    };
    if (not canWrite(caller)) {
      Runtime.trap("Unauthorized: Auditors cannot create sale invoices");
    };
    saleInvoices.add(invoice.id, invoice);
  };

  public shared ({ caller }) func updateSaleInvoice(invoice : SaleInvoice) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update sale invoices");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can update sale invoices");
    };
    saleInvoices.add(invoice.id, invoice);
  };

  public query ({ caller }) func getSaleInvoice(id : Text) : async SaleInvoice {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view sale invoices");
    };
    switch (saleInvoices.get(id)) {
      case (null) { Runtime.trap("Sale invoice not found") };
      case (?invoice) { invoice };
    };
  };

  public query ({ caller }) func listSaleInvoices() : async [SaleInvoice] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list sale invoices");
    };
    saleInvoices.values().toArray().sort();
  };

  public query ({ caller }) func listSaleInvoicesByParty(partyId : Text) : async [SaleInvoice] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list sale invoices");
    };
    let filtered = saleInvoices.values().filter(func(inv) { inv.partyId == partyId });
    filtered.toArray().sort();
  };

  public query ({ caller }) func getDailySalesSummary(date : Time.Time) : async { totalSales : Float; invoiceCount : Nat } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view sales summary");
    };
    let dayStart = (date / 86400000000000) * 86400000000000;
    let dayEnd = dayStart + 86400000000000;
    var totalSales = 0.0;
    var count = 0;
    for (invoice in saleInvoices.values()) {
      if (invoice.date >= dayStart and invoice.date < dayEnd) {
        totalSales += invoice.total;
        count += 1;
      };
    };
    { totalSales; invoiceCount = count };
  };

  // Purchase Bills - All non-Auditor users can create
  public shared ({ caller }) func createPurchaseBill(bill : PurchaseBill) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create purchase bills");
    };
    if (not canWrite(caller)) {
      Runtime.trap("Unauthorized: Auditors cannot create purchase bills");
    };
    purchaseBills.add(bill.id, bill);
  };

  public shared ({ caller }) func updatePurchaseBill(bill : PurchaseBill) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update purchase bills");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can update purchase bills");
    };
    purchaseBills.add(bill.id, bill);
  };

  public query ({ caller }) func getPurchaseBill(id : Text) : async ?PurchaseBill {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view purchase bills");
    };
    purchaseBills.get(id);
  };

  public query ({ caller }) func listPurchaseBills() : async [PurchaseBill] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list purchase bills");
    };
    purchaseBills.values().toArray().sort();
  };

  public query ({ caller }) func listPurchaseBillsByParty(partyId : Text) : async [PurchaseBill] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list purchase bills");
    };
    let filtered = purchaseBills.values().filter(func(bill) { bill.partyId == partyId });
    filtered.toArray().sort();
  };

  // Expenses - All non-Auditor users can create
  public shared ({ caller }) func createExpense(expense : Expense) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create expenses");
    };
    if (not canWrite(caller)) {
      Runtime.trap("Unauthorized: Auditors cannot create expenses");
    };
    expenses.add(expense.id, expense);
  };

  public query ({ caller }) func listExpenses() : async [Expense] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list expenses");
    };
    expenses.values().toArray().sort();
  };

  public query ({ caller }) func listExpensesByCategory(category : Text) : async [Expense] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list expenses");
    };
    let filtered = expenses.values().filter(func(exp) { exp.category == category });
    filtered.toArray().sort();
  };

  // Credit Notes - All non-Auditor users can create
  public shared ({ caller }) func createCreditNote(note : CreditNote) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create credit notes");
    };
    if (not canWrite(caller)) {
      Runtime.trap("Unauthorized: Auditors cannot create credit notes");
    };
    creditNotes.add(note.id, note);
  };

  public query ({ caller }) func listCreditNotes() : async [CreditNote] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list credit notes");
    };
    creditNotes.values().toArray();
  };

  // Debit Notes - All non-Auditor users can create
  public shared ({ caller }) func createDebitNote(note : DebitNote) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create debit notes");
    };
    if (not canWrite(caller)) {
      Runtime.trap("Unauthorized: Auditors cannot create debit notes");
    };
    debitNotes.add(note.id, note);
  };

  public query ({ caller }) func listDebitNotes() : async [DebitNote] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list debit notes");
    };
    debitNotes.values().toArray();
  };

  // Invoice Templates - Admin and Manager only
  public shared ({ caller }) func createInvoiceTemplate(template : InvoiceTemplate) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can create invoice templates");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can create invoice templates");
    };
    invoiceTemplates.add(template.id, template);
  };

  public shared ({ caller }) func updateInvoiceTemplate(template : InvoiceTemplate) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can update invoice templates");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can update invoice templates");
    };
    invoiceTemplates.add(template.id, template);
  };

  public shared ({ caller }) func setDefaultTemplate(id : Text) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can set default template");
    };
    if (not hasAppRole(caller, #Manager)) {
      Runtime.trap("Unauthorized: Only Admin or Manager can set default template");
    };
    let templates = invoiceTemplates.toArray();
    for ((_, t) in templates.values()) {
      invoiceTemplates.add(t.id, { t with isDefault = t.id == id });
    };
  };

  public query ({ caller }) func listInvoiceTemplates() : async [InvoiceTemplate] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can list invoice templates");
    };
    invoiceTemplates.values().toArray();
  };

  public query ({ caller }) func getDefaultTemplate() : async ?InvoiceTemplate {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view templates");
    };
    invoiceTemplates.values().find(func(t) { t.isDefault });
  };

  // POS Sessions - All non-Auditor users can open/close
  public shared ({ caller }) func openPOSSession(session : POSSession) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can open POS sessions");
    };
    if (not canWrite(caller)) {
      Runtime.trap("Unauthorized: Auditors cannot open POS sessions");
    };
    posSessions.add(session.id, session);
  };

  public shared ({ caller }) func closePOSSession(id : Text, closingCash : Float) : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can close POS sessions");
    };
    if (not canWrite(caller)) {
      Runtime.trap("Unauthorized: Auditors cannot close POS sessions");
    };
    switch (posSessions.get(id)) {
      case (null) { Runtime.trap("POS session not found") };
      case (?session) {
        let callerPrincipal = caller.toText();
        if (session.cashierId != callerPrincipal and not hasAppRole(caller, #Manager)) {
          Runtime.trap("Unauthorized: Only the cashier or Manager can close this session");
        };
        posSessions.add(id, { session with closingCash; status = "closed" });
      };
    };
  };

  public query ({ caller }) func getCurrentPOSSession() : async ?POSSession {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view POS sessions");
    };
    posSessions.values().find(func(s) { s.status == "open" });
  };

  // Reports - All users can view
  public query ({ caller }) func getSalesSummary(startDate : Time.Time, endDate : Time.Time) : async { totalSales : Float; invoiceCount : Nat } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view sales summary");
    };
    var totalSales = 0.0;
    var count = 0;
    for (invoice in saleInvoices.values()) {
      if (invoice.date >= startDate and invoice.date <= endDate) {
        totalSales += invoice.total;
        count += 1;
      };
    };
    { totalSales; invoiceCount = count };
  };

  public query ({ caller }) func getInventoryReport() : async [{ product : Product; value : Float }] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view inventory report");
    };
    let report = products.values().toArray().map(
      func(p) {
        {
          product = p;
          value = p.stockQty.toFloat() * p.purchasePrice;
        };
      }
    );
    report;
  };

  public query ({ caller }) func getProfitLoss(startDate : Time.Time, endDate : Time.Time) : async { revenue : Float; cost : Float; expenses : Float; profit : Float } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view profit/loss");
    };
    var revenue = 0.0;
    var cost = 0.0;
    var expenseTotal = 0.0;

    for (invoice in saleInvoices.values()) {
      if (invoice.date >= startDate and invoice.date <= endDate) {
        revenue += invoice.total;
      };
    };

    for (bill in purchaseBills.values()) {
      if (bill.date >= startDate and bill.date <= endDate) {
        cost += bill.total;
      };
    };

    for (expense in expenses.values()) {
      if (expense.date >= startDate and expense.date <= endDate) {
        expenseTotal += expense.amount;
      };
    };

    {
      revenue;
      cost;
      expenses = expenseTotal;
      profit = revenue - cost - expenseTotal;
    };
  };

  public query ({ caller }) func getPartyLedger(partyId : Text) : async { party : ?Party; invoices : [SaleInvoice]; bills : [PurchaseBill] } {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view party ledger");
    };
    let party = parties.get(partyId);
    let invoices = saleInvoices.values().filter(func(inv) { inv.partyId == partyId }).toArray().sort();
    let bills = purchaseBills.values().filter(func(bill) { bill.partyId == partyId }).toArray().sort();
    { party; invoices; bills };
  };

  public query ({ caller }) func getExpenseSummary(startDate : Time.Time, endDate : Time.Time) : async [{ category : Text; total : Float }] {
    if (not AccessControl.hasPermission(accessControlState, caller, #user)) {
      Runtime.trap("Unauthorized: Only users can view expense summary");
    };
    let filtered = expenses.values().filter(
      func(exp) { exp.date >= startDate and exp.date <= endDate }
    );
    let categoryMap = Map.empty<Text, Float>();
    for (exp in filtered) {
      let current = switch (categoryMap.get(exp.category)) {
        case (null) { 0.0 };
        case (?val) { val };
      };
      categoryMap.add(exp.category, current + exp.amount);
    };
    categoryMap.toArray().map<(Text, Float), { category : Text; total : Float }>(
      func((cat, total)) { { category = cat; total } }
    );
  };

  // Utility function to clear data (for development/testing) - Admin only
  public shared ({ caller }) func clearData() : async () {
    if (not AccessControl.hasPermission(accessControlState, caller, #admin)) {
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
  };
};
