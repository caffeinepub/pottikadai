# Pottikadai

## Current State
New project. No existing code.

## Requested Changes (Diff)

### Add
- Full business management app inspired by Vyapar Gold feature set
- Role-based access: Admin, Manager, Salesman, Auditor
- POS (Point of Sale) module with touch/keyboard optimized UI
- Invoice Designer with templates for Thermal and A4/A5 printers
- Inventory Management: products, stock levels, low stock alerts
- Sales & Purchase: invoices, bills, purchase orders, credit/debit notes
- Parties module: customers and vendors with outstanding balance tracking
- Accounting: ledger, P&L, balance sheet, cash flow
- Expense Tracking: categorized business expenses
- Reports: sales, inventory, financial -- role-filtered
- Dark mode toggle (system default + manual override)
- Corporate design system: clean, professional, high-contrast, accessible
- Fully responsive: PC, tablet, mobile (web-first, PWA-ready)

### Modify
- N/A (new project)

### Remove
- N/A (new project)

## Implementation Plan

### Backend (Motoko)
- User/role management via authorization component
- Products: CRUD with categories, SKU, stock quantity, price
- Parties: customers and vendors with balance tracking
- Transactions: sales invoices, purchase bills, credit/debit notes
- Expenses: categorized entries
- POS session: cart, checkout, payment recording
- Invoice templates: stored JSON layout configs
- Reports: aggregated queries for sales, inventory, financial summaries

### Frontend (React + Tailwind)
- Auth flow: login, role-gated navigation
- Shell: sidebar nav (collapsible), top bar with dark mode toggle, role badge
- Dashboard: KPI cards (revenue, sales count, stock alerts, outstanding)
- POS screen: product grid + cart panel, quantity controls, payment modal
- Inventory: table with search/filter, add/edit product drawer
- Sales: invoice list, create invoice form, print preview
- Purchase: bill list, create purchase order form
- Parties: customer/vendor tabs, ledger view per party
- Accounting: ledger table, P&L summary, balance sheet
- Expenses: entry list, add expense form
- Invoice Designer: drag-and-drop template builder, print size selector
- Reports: tabbed reports by category, charts
- Settings: business profile, user management (Admin only)
- Dark mode: CSS variables + Tailwind dark class, persisted in localStorage
