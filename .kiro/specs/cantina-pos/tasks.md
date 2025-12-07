# Implementation Plan

## Phase 1: Project Setup and Core Infrastructure

- [x] 1. Initialize project structure
  - [x] 1.1 Create monorepo structure with packages for shared types, backend, and frontend
    - Set up npm workspaces or yarn workspaces
    - Create `packages/shared`, `packages/backend`, `packages/frontend-web`, `packages/frontend-mobile`
    - _Requirements: 11.1, 12.1, 12.2, 12.3_
  - [x] 1.2 Configure TypeScript and shared types
    - Create tsconfig.json for each package with shared base config
    - Define all domain interfaces in `packages/shared/types`
    - _Requirements: 11.1_
  - [x] 1.3 Set up testing framework
    - Install Jest and fast-check
    - Configure test scripts for each package
    - _Requirements: All_

## Phase 2: Backend - Core Services

- [-] 2. Implement Event Category Service
  - [x] 2.1 Create EventCategory data model and repository
    - Implement DynamoDB operations for categories (create, list, get, update, delete)
    - Add default categories initialization logic (Culto, Kids, Casais)
    - Implement event count calculation per category
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.6_
  - [ ]* 2.2 Write property test for default categories initialization
    - **Property 1: Default Categories Initialization**
    - **Validates: Requirements 1.1**
  - [ ]* 2.3 Write property test for category management
    - **Property 2: Category Management Consistency**
    - **Validates: Requirements 1.3, 1.6**
  - [ ]* 2.4 Write property test for category deletion protection
    - **Property 3: Category Deletion Protection**
    - **Validates: Requirements 1.5**

- [x] 3. Implement Menu Group Service
  - [x] 3.1 Create MenuGroup data model and repository
    - Implement DynamoDB operations for groups (create, list, delete)
    - Add default groups initialization logic
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [ ]* 3.2 Write property test for group management
    - **Property 6: Group Management Consistency**
    - **Validates: Requirements 3.2, 3.3**
  - [ ]* 3.3 Write property test for group deletion protection
    - **Property 7: Group Deletion Protection**
    - **Validates: Requirements 3.4**

- [-] 4. Implement Catalog Item Service
  - [x] 4.1 Create CatalogItem data model and repository
    - Implement CRUD operations for catalog items (with soft delete)
    - Implement search by description and group
    - Ensure edits don't affect existing menus
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_
  - [ ]* 4.2 Write property test for catalog persistence
    - **Property 8: Catalog Item Persistence**
    - **Validates: Requirements 4.1, 5.4**
  - [ ]* 4.3 Write property test for catalog search
    - **Property 9: Catalog Search Correctness**
    - **Validates: Requirements 4.3**
  - [ ]* 4.4 Write property test for soft delete isolation
    - **Property 29: Soft Delete Catalog Isolation**
    - **Validates: Requirements 4.5**

- [-] 5. Update Event Service for Category Association
  - [x] 5.1 Update Event data model and repository
    - Add categoryId as required field
    - Implement getEventsByCategory operation
    - Update create to require categoryId
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  - [ ]* 5.2 Write property test for event category association
    - **Property 4: Event Category Association**
    - **Validates: Requirements 2.2, 2.3, 2.4**
  - [ ]* 5.3 Write property test for events by category query
    - **Property 5: Events By Category Query**
    - **Validates: Requirements 2.1**

- [x] 6. Implement Menu Item Service
  - [x] 6.1 Create MenuItem data model and repository
    - Implement add, update, remove, and list by event
    - Handle stock tracking (0 = infinite)
    - _Requirements: 5.1, 5.2, 5.3, 5.5_
  - [ ]* 6.2 Write property test for infinite stock
    - **Property 11: Infinite Stock Behavior**
    - **Validates: Requirements 5.3**

- [x] 7. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Backend - Order and Sales

- [x] 8. Implement Order Service
  - [x] 8.1 Create Order data model and business logic
    - Implement order creation, item management, and total calculation
    - Validate stock availability when adding items
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.3, 7.4_
  - [ ]* 8.2 Write property test for order total calculation
    - **Property 10: Order Total Calculation**
    - **Validates: Requirements 6.2, 6.3, 6.4**
  - [ ]* 8.3 Write property test for stock limit enforcement
    - **Property 14: Stock Limit Enforcement**
    - **Validates: Requirements 7.4**

- [x] 9. Implement Sales Service
  - [x] 9.1 Create Sale data model and confirmation logic
    - Implement sale confirmation with payment processing
    - Handle stock decrement on confirmation
    - Support mixed payment methods
    - Include createdBy for audit trail
    - _Requirements: 7.1, 7.2, 8.1, 8.2, 8.3, 8.4, 18.1_
  - [x] 9.2 Implement order cancellation
    - Cancel pending orders and release reserved stock
    - Mark cancelled orders appropriately
    - _Requirements: 14.1, 14.2, 14.3_
  - [x] 9.3 Implement sale refund
    - Refund confirmed sales with reason
    - Restore stock on refund
    - Adjust customer balance for credit sales
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [ ]* 9.4 Write property test for stock decrement
    - **Property 12: Stock Decrement Consistency**
    - **Validates: Requirements 7.1**
  - [ ]* 9.5 Write property test for stock exhaustion
    - **Property 13: Stock Exhaustion Availability**
    - **Validates: Requirements 7.2**
  - [ ]* 9.6 Write property test for payment total
    - **Property 15: Payment Total Consistency**
    - **Validates: Requirements 8.3**
  - [ ]* 9.7 Write property test for sale record completeness
    - **Property 16: Sale Record Completeness**
    - **Validates: Requirements 8.4**
  - [ ]* 9.8 Write property test for order cancellation
    - **Property 23: Order Cancellation Stock Release**
    - **Validates: Requirements 14.1, 14.2**
  - [ ]* 9.9 Write property test for refund stock restoration
    - **Property 24: Refund Stock Restoration**
    - **Validates: Requirements 15.1**
  - [ ]* 9.10 Write property test for refund credit balance
    - **Property 25: Refund Credit Balance Adjustment**
    - **Validates: Requirements 15.2**

- [x] 10. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Backend - Customer and Credit System

- [x] 11. Implement Customer Service
  - [x] 11.1 Create Customer data model and repository
    - Implement create, search, and get operations
    - _Requirements: 9.2, 9.3_
  - [x] 11.2 Implement credit sale association
    - Link sales to customers when payment method is 'credit'
    - Mark credit sales as unpaid
    - _Requirements: 9.1, 9.4_
  - [ ]* 11.3 Write property test for credit sale association
    - **Property 17: Credit Sale Customer Association**
    - **Validates: Requirements 9.4**

- [x] 12. Implement Customer Balance and Payment
  - [x] 12.1 Create CustomerPayment data model and balance calculation
    - Implement payment registration (partial/full)
    - Calculate pending balance from sales and payments
    - _Requirements: 10.3, 10.4, 10.5, 10.6_
  - [x] 12.2 Implement customer history retrieval
    - Return all sales and payments for a customer
    - _Requirements: 10.2_
  - [ ]* 12.3 Write property test for customer balance
    - **Property 18: Customer Balance Calculation**
    - **Validates: Requirements 10.3**
  - [ ]* 12.4 Write property test for customer history
    - **Property 19: Customer History Completeness**
    - **Validates: Requirements 10.2, 10.6**

- [x] 13. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Backend - Reports and API

- [x] 14. Update Report Service for Category Reports
  - [x] 14.1 Create event report aggregation logic
    - Calculate total sales, items sold, payment breakdown
    - Separate paid vs pending vs refunded amounts
    - _Requirements: 11.1, 11.3, 11.4_
  - [x] 14.2 Implement category report aggregation
    - Aggregate data from all events in a category
    - Include event breakdown within category
    - _Requirements: 11.2_
  - [x] 14.3 Implement stock report
    - Show initial stock, sold, available, and surplus per item
    - _Requirements: 11.5_
  - [x] 14.4 Implement CSV export
    - Export report data to CSV format (event and category)
    - _Requirements: 11.6_
  - [ ]* 14.5 Write property test for event report aggregation
    - **Property 20: Event Report Aggregation**
    - **Validates: Requirements 11.1**
  - [ ]* 14.6 Write property test for category report aggregation
    - **Property 21: Category Report Aggregation**
    - **Validates: Requirements 11.2**

- [x] 15. Update API Layer for Categories
  - [x] 15.1 Implement REST API endpoints with Lambda handlers
    - Categories: GET /categories, POST /categories, GET /categories/{id}, PUT /categories/{id}, DELETE /categories/{id}
    - Events: POST /events, GET /events, GET /categories/{id}/events, GET /events/{id}, PATCH /events/{id}/status
    - Menu: GET /groups, POST /groups, DELETE /groups/{id}
    - Catalog: GET /catalog, POST /catalog, PUT /catalog/{id}, DELETE /catalog/{id}, GET /catalog/search
    - Menu Items: GET /events/{id}/menu, POST /events/{id}/menu, PUT /menu/{id}, DELETE /menu/{id}
    - Orders: POST /orders, GET /orders/{id}, PUT /orders/{id}/items, DELETE /orders/{id}
    - Sales: POST /sales, GET /events/{id}/sales, GET /sales/{id}/receipt, POST /sales/{id}/refund
    - Customers: GET /customers/search, POST /customers, GET /customers/{id}, GET /customers/{id}/balance, GET /customers/{id}/history, POST /customers/{id}/payments
    - Reports: GET /events/{id}/report, GET /categories/{id}/report, GET /events/{id}/stock-report, GET /events/{id}/report/export, GET /categories/{id}/report/export
    - _Requirements: All_
  - [x] 15.2 Implement input validation middleware
    - Validate price > 0, non-empty names (including categories), positive quantities
    - Return appropriate error codes
    - _Requirements: 16.1, 16.2, 16.3, 16.4_
  - [ ]* 15.3 Write property test for price validation
    - **Property 26: Input Validation - Price Positivity**
    - **Validates: Requirements 16.1**
  - [ ]* 15.4 Write property test for name validation
    - **Property 27: Input Validation - Name Non-Empty**
    - **Validates: Requirements 16.2**
  - [ ]* 15.5 Write integration tests for API endpoints
    - Test complete sale flow
    - Test credit sale and payment flow
    - Test category CRUD operations
    - _Requirements: All_

- [x] 16. Implement Data Persistence Layer
  - [x] 16.1 Create DynamoDB repository implementations
    - Implement all table operations with proper error handling
    - Add retry logic for transient failures
    - Include version field for optimistic locking
    - _Requirements: 12.1_
  - [x] 16.2 Implement Audit Log service
    - Log all sales, payments, and price changes
    - Include userId and timestamp
    - _Requirements: 18.1, 18.2, 18.3_
  - [ ]* 16.3 Write property test for data round-trip
    - **Property 22: Data Persistence Round-Trip**
    - **Validates: Requirements 12.1**
  - [ ]* 16.4 Write property test for audit trail
    - **Property 28: Audit Trail Completeness**
    - **Validates: Requirements 18.1, 18.2, 18.3**

- [x] 17. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Frontend - Shared Components

- [x] 18. Set up frontend shared infrastructure
  - [x] 18.1 Create shared UI component library
    - Button, Input, Card, Modal, List components
    - Consistent styling for all platforms
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 18.2 Implement API client and state management
    - Create typed API client using shared interfaces
    - Set up React Context for global state
    - Implement offline queue for pending operations
    - _Requirements: 12.1, 12.2, 12.3_

## Phase 7: Frontend - Category and Event Management

- [x] 19. Implement Category Management UI
  - [x] 19.1 Create Category list screen
    - List all categories with event count
    - Navigate to events within category
    - _Requirements: 1.2_
  - [x] 19.2 Create Category CRUD interface
    - Create new category form
    - Edit category name
    - Delete category (with protection for categories with events)
    - _Requirements: 1.3, 1.4, 1.5, 1.6_

- [x] 20. Update Event Management UI
  - [x] 20.1 Update Event list and creation screens
    - List events grouped by category
    - List events within a selected category
    - Form for creating events with category selector (pre-selected when navigating from category)
    - Date picker for multiple non-sequential dates
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 21. Implement Menu Management UI
  - [x] 21.1 Create Menu configuration screen
    - Display groups with items
    - Add/remove groups functionality
    - _Requirements: 3.1, 3.2, 3.3, 3.4_
  - [x] 21.2 Create Catalog and Menu Item management
    - Catalog browser with search
    - Add items to menu with price/stock override
    - Create new catalog items inline
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 5.1, 5.2, 5.3, 5.4, 5.5_

## Phase 8: Frontend - Sales Mode

- [x] 22. Implement Sales Mode UI
  - [x] 22.1 Create order building interface
    - Grid/list of menu items by group
    - Quick add buttons with quantity adjustment
    - Running total display
    - Stock availability indicators
    - Cancel/clear order button
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.3, 7.4, 14.1, 14.2, 14.3_
  - [x] 22.2 Create payment processing interface
    - Payment method selection (cash, card, transfer, credit)
    - Mixed payment support with amount splitting
    - Customer selection/creation for credit sales
    - Sale confirmation with receipt display
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 9.1, 9.2, 9.3, 9.4_
  - [x] 22.3 Create receipt and refund interface
    - Display receipt after sale
    - View past receipts
    - Refund sale with reason input
    - _Requirements: 15.1, 15.2, 15.3, 15.4, 17.1, 17.2, 17.3_

## Phase 9: Frontend - Customer and Reports

- [x] 23. Implement Customer Management UI
  - [x] 23.1 Create customer search and history screen
    - Search customers by name
    - Display balance and full history
    - _Requirements: 10.1, 10.2, 10.3_
  - [x] 23.2 Create payment registration interface
    - Partial/full payment input
    - Mixed payment method support
    - Payment confirmation
    - _Requirements: 10.4, 10.5, 10.6_

- [x] 24. Update Reports UI for Category Reports
  - [x] 24.1 Create event report screen
    - Summary cards (total, paid, pending, refunded)
    - Items sold breakdown
    - Payment method breakdown
    - Period filters
    - _Requirements: 11.1, 11.3, 11.4_
  - [x] 24.2 Create category report screen
    - Aggregate data from all events in category
    - Event breakdown within category
    - _Requirements: 11.2_
  - [x] 24.3 Create stock report screen
    - Show initial, sold, available, surplus per item
    - _Requirements: 11.5_
  - [x] 24.4 Implement CSV export button
    - Download report as CSV file (event and category)
    - _Requirements: 11.6_

## Phase 10: Platform-Specific Optimization

- [x] 25. Optimize for target platforms
  - [x] 25.1 Android Tablet optimization
    - Large touch targets
    - Landscape-optimized layouts
    - _Requirements: 13.1_
  - [x] 25.2 Web browser optimization
    - Responsive layouts
    - Keyboard shortcuts
    - _Requirements: 13.2_
  - [x] 25.3 Mobile (iOS/Android) optimization
    - Compact layouts for smaller screens
    - Touch-friendly navigation
    - _Requirements: 13.3_

- [x] 26. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
