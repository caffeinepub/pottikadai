import Map "mo:core/Map";
import Nat "mo:core/Nat";
import Blob "mo:core/Blob";
import Principal "mo:core/Principal";
import Time "mo:core/Time";
import Array "mo:core/Array";
import Text "mo:core/Text";

module {
  // Types
  public type AppRole = {
    #Admin;
    #Manager;
    #Salesman;
    #Auditor;
  };

  public type Product = {
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
    gstRate : Float;
  };

  public type Party = {
    id : Text;
    name : Text;
    kind : { #customer; #vendor };
    phone : Text;
    email : Text;
    address : Text;
    openingBalance : Float;
    currentBalance : Float;
  };

  public type SaleInvoiceItem = {
    productId : Text;
    qty : Int;
    price : Float;
    discount : Float;
  };

  public type SaleInvoice = {
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

  public type PurchaseBill = {
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

  public type Expense = {
    id : Text;
    date : Time.Time;
    category : Text;
    amount : Float;
    description : Text;
    createdBy : Text;
  };

  public type CreditNote = {
    id : Text;
    date : Time.Time;
    partyId : Text;
    amount : Float;
    reason : Text;
    linkedInvoiceId : Text;
  };

  public type DebitNote = {
    id : Text;
    date : Time.Time;
    partyId : Text;
    amount : Float;
    reason : Text;
    linkedBillId : Text;
  };

  public type InvoiceTemplate = {
    id : Text;
    name : Text;
    printSize : { #thermal; #a4; #a5 };
    layoutConfig : Text;
    isDefault : Bool;
  };

  public type POSSession = {
    id : Text;
    date : Time.Time;
    cashierId : Text;
    openingCash : Float;
    closingCash : Float;
    totalSales : Float;
    status : Text;
  };

  public type BusinessProfile = {
    businessName : Text;
    gstNumber : Text;
    address : Text;
    phone : Text;
    email : Text;
    logoUrl : Text;
    bankAccounts : [{ id : Text; bankName : Text; accountNumber : Text; ifsc : Text; accountHolder : Text }];
    upiIds : [{ id : Text; upiLabel : Text; upiId : Text; isDefault : Bool }];
  };

  // Quotation Types
  public type QuotationItem = {
    productId : Text;
    qty : Nat;
    price : Float;
    discount : Float;
  };

  public type Quotation = {
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

  // Old and new actor types
  type _LegacyUserProfile = { name : Text; appRole : AppRole };

  public type OldActor = {
    userProfiles : Map.Map<Principal, _LegacyUserProfile>;
    appUsers : Map.Map<Text, { username : Text; password : Text; name : Text; appRole : AppRole }>;
    products : Map.Map<Text, Product>;
    parties : Map.Map<Text, Party>;
    saleInvoices : Map.Map<Text, SaleInvoice>;
    purchaseBills : Map.Map<Text, PurchaseBill>;
    expenses : Map.Map<Text, Expense>;
    creditNotes : Map.Map<Text, CreditNote>;
    debitNotes : Map.Map<Text, DebitNote>;
    invoiceTemplates : Map.Map<Text, InvoiceTemplate>;
    posSessions : Map.Map<Text, POSSession>;
    businessProfile : ?BusinessProfile;
  };

  public type NewActor = {
    userProfiles : Map.Map<Principal, _LegacyUserProfile>;
    appUsers : Map.Map<Text, { username : Text; password : Text; name : Text; appRole : AppRole }>;
    products : Map.Map<Text, Product>;
    parties : Map.Map<Text, Party>;
    saleInvoices : Map.Map<Text, SaleInvoice>;
    purchaseBills : Map.Map<Text, PurchaseBill>;
    expenses : Map.Map<Text, Expense>;
    creditNotes : Map.Map<Text, CreditNote>;
    debitNotes : Map.Map<Text, DebitNote>;
    invoiceTemplates : Map.Map<Text, InvoiceTemplate>;
    posSessions : Map.Map<Text, POSSession>;
    businessProfile : ?BusinessProfile;
    quotations : Map.Map<Text, Quotation>;
    dailyQuotationCount : Map.Map<Text, Nat>;
  };

  // Migration function
  public func run(old : OldActor) : NewActor {
    {
      userProfiles = old.userProfiles;
      appUsers = old.appUsers;
      products = old.products;
      parties = old.parties;
      saleInvoices = old.saleInvoices;
      purchaseBills = old.purchaseBills;
      expenses = old.expenses;
      creditNotes = old.creditNotes;
      debitNotes = old.debitNotes;
      invoiceTemplates = old.invoiceTemplates;
      posSessions = old.posSessions;
      businessProfile = old.businessProfile;
      quotations = Map.empty<Text, Quotation>();
      dailyQuotationCount = Map.empty<Text, Nat>();
    };
  };
};
