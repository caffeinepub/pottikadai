# Pottikadai

## Current State
Full-featured business management app with Dashboard, POS, Products, Sales, Purchase, Parties, Accounting, Expenses, Invoice Designer, Reports, Settings. Backend has sales invoices, purchase bills, products, parties, expenses, business profile (with GST, UPI IDs, bank accounts). Authentication via username/password.

## Requested Changes (Diff)

### Add
- `Quotation` data model: id, quotationNumber (daily auto-number e.g. Q-20260314-001), date, partyId, items (same as SaleInvoiceItem), subtotal, tax, total, status (draft/confirmed/converted), notes, createdBy
- Backend APIs: createQuotation, updateQuotation, listQuotations, getQuotation, getDailyQuotationCount (for daily numbering), convertQuotationToInvoice
- New `Quotations` page accessible from nav for Admin, Manager, Salesman
- List view: show quotation number, date, party name, total, status badges, actions (edit, convert to invoice)
- Create/Edit form: party selector, item lines (product, qty, price, discount), notes, auto-calculate subtotal/tax/total
- Convert to Invoice: opens payment mode selector (cash/card/UPI), then creates SaleInvoice from quotation data, marks quotation as converted

### Modify
- `App.tsx`: add "quotations" page routing, import Quotations component
- `AppShell.tsx`: add "quotations" nav item with FileText icon, for Admin/Manager/Salesman roles
- `Page` type: add "quotations"

### Remove
- Nothing removed

## Implementation Plan
1. Backend: add Quotation type, daily counter logic, CRUD + convert function
2. Update backend.d.ts with Quotation interface and new API methods
3. Add Quotations page component with list, create, edit, convert-to-invoice flows
4. Wire up nav and routing in AppShell and App.tsx
