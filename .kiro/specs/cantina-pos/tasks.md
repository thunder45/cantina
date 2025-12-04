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

- [x] 2. Implement Menu Group Service
  - [x] 2.1 Create MenuGroup data model and repository
    - Implement DynamoDB operations for groups (create, list, delete)
    - Add default groups initialization logic
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [ ]* 2.2 Write property test for group management
    - **Property 2: Group Management Consistency**
    - **Validates: Requirements 2.2, 2.3**
  - [ ]* 2.3 Write property test for group deletion protection
    - **Property 3: Group Deletion Protection**
    - **Validates: Requirements 2.4**

- [-] 3. Implement Catalog Item Service
  - [x] 3.1 Create CatalogItem data model and repository
    - Implement CRUD operations for catalog items (with soft delete)
    - Implement search by description and group
    - Ensure edits don't affect existing menus
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6_
  - [ ]* 3.2 Write property test for catalog persistence
    - **Property 4: Catalog Item Persistence**
    - **Validates: Requirements 3.1, 4.4**
  - [ ]* 3.3 Write property test for catalog search
    - **Property 5: Catalog Search Correctness**
    - **Validates: Requirements 3.3**
  - [ ]* 3.4 Write property test for soft delete isolation
    - **Property 24: Soft Delete Catalog Isolation**
    - **Validates: Requirements 3.5**

- [x] 4. Implement Event Service
  - [x] 4.1 Create Event data model and repository
    - Implement create, list, get, and status update operations
    - Support multiple non-sequential dates
    - _Requirements: 1.1, 1.2, 1.3, 1.4_
  - [ ]* 4.2 Write property test for event creation
    - **Property 1: Event Creation Completeness**
    - **Validates: Requirements 1.1, 1.2, 1.3**

- [x] 5. Implement Menu Item Service
  - [x] 5.1 Create MenuItem data model and repository
    - Implement add, update, remove, and list by event
    - Handle stock tracking (0 = infinite)
    - _Requirements: 4.1, 4.2, 4.3, 4.5_
  - [ ]* 5.2 Write property test for infinite stock
    - **Property 7: Infinite Stock Behavior**
    - **Validates: Requirements 4.3**

- [x] 6. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 3: Backend - Order and Sales

- [x] 7. Implement Order Service
  - [x] 7.1 Create Order data model and business logic
    - Implement order creation, item management, and total calculation
    - Validate stock availability when adding items
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 6.4_
  - [ ]* 7.2 Write property test for order total calculation
    - **Property 6: Order Total Calculation**
    - **Validates: Requirements 5.2, 5.3, 5.4**
  - [ ]* 7.3 Write property test for stock limit enforcement
    - **Property 10: Stock Limit Enforcement**
    - **Validates: Requirements 6.4**

- [x] 8. Implement Sales Service
  - [x] 8.1 Create Sale data model and confirmation logic
    - Implement sale confirmation with payment processing
    - Handle stock decrement on confirmation
    - Support mixed payment methods
    - Include createdBy for audit trail
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3, 7.4, 17.1_
  - [x] 8.2 Implement order cancellation
    - Cancel pending orders and release reserved stock
    - Mark cancelled orders appropriately
    - _Requirements: 13.1, 13.2, 13.3_
  - [x] 8.3 Implement sale refund
    - Refund confirmed sales with reason
    - Restore stock on refund
    - Adjust customer balance for credit sales
    - _Requirements: 14.1, 14.2, 14.3, 14.4_
  - [ ]* 8.4 Write property test for stock decrement
    - **Property 8: Stock Decrement Consistency**
    - **Validates: Requirements 6.1**
  - [ ]* 8.5 Write property test for stock exhaustion
    - **Property 9: Stock Exhaustion Availability**
    - **Validates: Requirements 6.2**
  - [ ]* 8.6 Write property test for payment total
    - **Property 11: Payment Total Consistency**
    - **Validates: Requirements 7.3**
  - [ ]* 8.7 Write property test for sale record completeness
    - **Property 12: Sale Record Completeness**
    - **Validates: Requirements 7.4**
  - [ ]* 8.8 Write property test for order cancellation
    - **Property 18: Order Cancellation Stock Release**
    - **Validates: Requirements 13.1, 13.2**
  - [ ]* 8.9 Write property test for refund stock restoration
    - **Property 19: Refund Stock Restoration**
    - **Validates: Requirements 14.1**
  - [ ]* 8.10 Write property test for refund credit balance
    - **Property 20: Refund Credit Balance Adjustment**
    - **Validates: Requirements 14.2**

- [x] 9. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 4: Backend - Customer and Credit System

- [x] 10. Implement Customer Service
  - [x] 10.1 Create Customer data model and repository
    - Implement create, search, and get operations
    - _Requirements: 8.2, 8.3_
  - [x] 10.2 Implement credit sale association
    - Link sales to customers when payment method is 'credit'
    - Mark credit sales as unpaid
    - _Requirements: 8.1, 8.4_
  - [ ]* 10.3 Write property test for credit sale association
    - **Property 13: Credit Sale Customer Association**
    - **Validates: Requirements 8.4**

- [x] 11. Implement Customer Balance and Payment
  - [x] 11.1 Create CustomerPayment data model and balance calculation
    - Implement payment registration (partial/full)
    - Calculate pending balance from sales and payments
    - _Requirements: 9.3, 9.4, 9.5, 9.6_
  - [x] 11.2 Implement customer history retrieval
    - Return all sales and payments for a customer
    - _Requirements: 9.2_
  - [ ]* 11.3 Write property test for customer balance
    - **Property 14: Customer Balance Calculation**
    - **Validates: Requirements 9.3**
  - [ ]* 11.4 Write property test for customer history
    - **Property 15: Customer History Completeness**
    - **Validates: Requirements 9.2, 9.6**

- [x] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 5: Backend - Reports and API

- [x] 13. Implement Report Service
  - [x] 13.1 Create event report aggregation logic
    - Calculate total sales, items sold, payment breakdown
    - Support filtering by category and period
    - Separate paid vs pending vs refunded amounts
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 13.2 Implement stock report
    - Show initial stock, sold, available, and surplus per item
    - _Requirements: 10.5_
  - [x] 13.3 Implement CSV export
    - Export report data to CSV format
    - _Requirements: 10.6_
  - [ ]* 13.4 Write property test for report aggregation
    - **Property 16: Event Report Aggregation**
    - **Validates: Requirements 10.1**

- [x] 14. Create API Layer
  - [x] 14.1 Implement REST API endpoints with Lambda handlers
    - Events: POST /events, GET /events, GET /events/{id}, PATCH /events/{id}/status
    - Menu: GET /groups, POST /groups, DELETE /groups/{id}
    - Catalog: GET /catalog, POST /catalog, PUT /catalog/{id}, DELETE /catalog/{id}, GET /catalog/search
    - Menu Items: GET /events/{id}/menu, POST /events/{id}/menu, PUT /menu/{id}, DELETE /menu/{id}
    - Orders: POST /orders, GET /orders/{id}, PUT /orders/{id}/items, DELETE /orders/{id}
    - Sales: POST /sales, GET /events/{id}/sales, GET /sales/{id}/receipt, POST /sales/{id}/refund
    - Customers: GET /customers/search, POST /customers, GET /customers/{id}, GET /customers/{id}/balance, GET /customers/{id}/history, POST /customers/{id}/payments
    - Reports: GET /events/{id}/report, GET /events/{id}/stock-report, GET /events/{id}/report/export
    - _Requirements: All_
  - [x] 14.2 Implement input validation middleware
    - Validate price > 0, non-empty names, positive quantities
    - Return appropriate error codes
    - _Requirements: 15.1, 15.2, 15.3, 15.4_
  - [ ]* 14.3 Write property test for price validation
    - **Property 21: Input Validation - Price Positivity**
    - **Validates: Requirements 15.1**
  - [ ]* 14.4 Write property test for name validation
    - **Property 22: Input Validation - Name Non-Empty**
    - **Validates: Requirements 15.2**
  - [ ]* 14.5 Write integration tests for API endpoints
    - Test complete sale flow
    - Test credit sale and payment flow
    - _Requirements: All_

- [x] 15. Implement Data Persistence Layer
  - [x] 15.1 Create DynamoDB repository implementations
    - Implement all table operations with proper error handling
    - Add retry logic for transient failures
    - Include version field for optimistic locking
    - _Requirements: 11.1_
  - [x] 15.2 Implement Audit Log service
    - Log all sales, payments, and price changes
    - Include userId and timestamp
    - _Requirements: 17.1, 17.2, 17.3_
  - [ ]* 15.3 Write property test for data round-trip
    - **Property 17: Data Persistence Round-Trip**
    - **Validates: Requirements 11.1**
  - [ ]* 15.4 Write property test for audit trail
    - **Property 23: Audit Trail Completeness**
    - **Validates: Requirements 17.1, 17.2, 17.3**

- [x] 16. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

## Phase 6: Frontend - Shared Components

- [x] 17. Set up frontend shared infrastructure
  - [x] 17.1 Create shared UI component library
    - Button, Input, Card, Modal, List components
    - Consistent styling for all platforms
    - _Requirements: 12.1, 12.2, 12.3_
  - [x] 17.2 Implement API client and state management
    - Create typed API client using shared interfaces
    - Set up React Context for global state
    - Implement offline queue for pending operations
    - _Requirements: 11.1, 11.2, 11.3_

## Phase 7: Frontend - Event and Menu Management

- [x] 18. Implement Event Management UI
  - [x] 18.1 Create Event list and creation screens
    - List events with status indicators
    - Form for creating events with date picker (multiple dates)
    - Category input with tags
    - _Requirements: 1.1, 1.2, 1.3, 1.4_

- [x] 19. Implement Menu Management UI
  - [x] 19.1 Create Menu configuration screen
    - Display groups with items
    - Add/remove groups functionality
    - _Requirements: 2.1, 2.2, 2.3, 2.4_
  - [x] 19.2 Create Catalog and Menu Item management
    - Catalog browser with search
    - Add items to menu with price/stock override
    - Create new catalog items inline
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 4.1, 4.2, 4.3, 4.4, 4.5_

## Phase 8: Frontend - Sales Mode

- [x] 20. Implement Sales Mode UI
  - [x] 20.1 Create order building interface
    - Grid/list of menu items by group
    - Quick add buttons with quantity adjustment
    - Running total display
    - Stock availability indicators
    - Cancel/clear order button
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.3, 6.4, 13.1, 13.2, 13.3_
  - [x] 20.2 Create payment processing interface
    - Payment method selection (cash, card, transfer, credit)
    - Mixed payment support with amount splitting
    - Customer selection/creation for credit sales
    - Sale confirmation with receipt display
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4_
  - [x] 20.3 Create receipt and refund interface
    - Display receipt after sale
    - View past receipts
    - Refund sale with reason input
    - _Requirements: 14.1, 14.2, 14.3, 14.4, 16.1, 16.2, 16.3_

## Phase 9: Frontend - Customer and Reports

- [x] 21. Implement Customer Management UI
  - [x] 21.1 Create customer search and history screen
    - Search customers by name
    - Display balance and full history
    - _Requirements: 9.1, 9.2, 9.3_
  - [x] 21.2 Create payment registration interface
    - Partial/full payment input
    - Mixed payment method support
    - Payment confirmation
    - _Requirements: 9.4, 9.5, 9.6_

- [x] 22. Implement Reports UI
  - [x] 22.1 Create event report screen
    - Summary cards (total, paid, pending, refunded)
    - Items sold breakdown
    - Payment method breakdown
    - Category and period filters
    - _Requirements: 10.1, 10.2, 10.3, 10.4_
  - [x] 22.2 Create stock report screen
    - Show initial, sold, available, surplus per item
    - _Requirements: 10.5_
  - [x] 22.3 Implement CSV export button
    - Download report as CSV file
    - _Requirements: 10.6_

## Phase 10: Platform-Specific Optimization

- [x] 23. Optimize for target platforms
  - [x] 23.1 Android Tablet optimization
    - Large touch targets
    - Landscape-optimized layouts
    - _Requirements: 12.1_
  - [x] 23.2 Web browser optimization
    - Responsive layouts
    - Keyboard shortcuts
    - _Requirements: 12.2_
  - [x] 23.3 Mobile (iOS/Android) optimization
    - Compact layouts for smaller screens
    - Touch-friendly navigation
    - _Requirements: 12.3_

- [x] 24. Final Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
