# KitchenAsty

[![CI](https://github.com/mighty840/kitchenasty/actions/workflows/ci.yml/badge.svg)](https://github.com/mighty840/kitchenasty/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)](https://expressjs.com/)
[![Prisma](https://img.shields.io/badge/Prisma-5-2D3748?logo=prisma&logoColor=white)](https://www.prisma.io/)
[![Playwright](https://img.shields.io/badge/Playwright-E2E-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A self-hosted restaurant online ordering, table reservation, and management system. KitchenAsty enables restaurants, cafes, and takeaways to accept online orders for delivery and pickup, manage menus, handle table reservations, and run operations from a single admin panel — inspired by [TastyIgniter](https://tastyigniter.com/).

---

## Features

### Implemented

- **Multi-location management** — CRUD for restaurant locations with operating hours and delivery zones
- **JWT authentication** — Staff login with role-based access control (Super Admin, Manager, Staff) and customer registration/login
- **Admin panel** — Sidebar navigation, dashboard with metric cards, location list and form editor
- **Customer storefront** — Responsive layout with header/footer, location selector, customer auth (login/register/account), 404 page
- **Menu browsing** — Category sidebar with item counts, search with debounce, responsive grid of item cards, item detail modal with option selectors, quantity picker, and price calculation
- **Cart & checkout** — Shopping cart drawer with quantity controls, checkout page with delivery/pickup toggle, address entry, scheduling, order notes, coupon code, payment method selection (cash/Stripe), and order summary with tax/fees
- **Order API** — Order creation with validation, stock tracking, guest checkout support, order listing/detail for staff, status updates
- **Stripe payments** — Payment intent creation, webhook handler for payment confirmation/failure, cash on delivery option, payment record tracking
- **Menu management** — Category CRUD with nesting, menu item CRUD with options/allergens/mealtimes, stock tracking
- **Table management** — CRUD for tables per location with capacity tracking and reservation protection
- **Order management** — Admin order list with status/type filters, order detail view with items/totals, status workflow controls
- **Order tracking** — Customer order history page, order status page with visual progress tracker, account integration
- **Reservation system** — Customer booking with time slot availability, admin reservation list with status workflow (pending/confirmed/seated/completed), table assignment, date/status filters
- **Coupon system** — CRUD for coupons (percentage, fixed, free delivery), validation with min order/usage limits/date restrictions, admin coupon management with create/edit forms
- **Review system** — Customer review submission (1-5 stars + comment), admin moderation (approve/reject/delete), public approved reviews per location with average rating
- **Dashboard & reports** — Admin dashboard with real-time metrics (orders today, revenue, reservations, customers), summary stats (weekly/monthly), recent orders list, top selling items
- **Email notifications** — Branded HTML email templates for order confirmation, status updates, and reservation confirmations via Nodemailer
- **Full test suite** — Unit, integration, and E2E tests (330 tests)
- **CI/CD pipeline** — GitHub Actions with lint, test, audit, build, and artifact packaging

### Planned

- Menu item image upload
- Real-time order status updates (Socket.IO) and kitchen display view
- Advanced analytics and reporting charts
- Multi-language support
- Public REST API

See [`PLAN.md`](PLAN.md) for the full roadmap.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| **Backend** | [Node.js](https://nodejs.org/) + [Express](https://expressjs.com/) |
| **Frontend (Admin)** | [React 18](https://react.dev/) + [Vite](https://vite.dev/) |
| **Frontend (Storefront)** | [React 18](https://react.dev/) + [Vite](https://vite.dev/) |
| **Database** | [PostgreSQL](https://www.postgresql.org/) + [Prisma ORM](https://www.prisma.io/) |
| **Auth** | JWT ([jsonwebtoken](https://github.com/auth0/node-jsonwebtoken)) + [bcrypt](https://github.com/dcodeIO/bcrypt.js) |
| **Validation** | [Zod](https://zod.dev/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Testing** | [Vitest](https://vitest.dev/) + [Supertest](https://github.com/ladjs/supertest) + [Playwright](https://playwright.dev/) |
| **CI/CD** | [GitHub Actions](https://github.com/features/actions) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) (strict mode) |

---

## Project Structure

```
kitchenasty/
├── .github/workflows/     # CI pipeline
├── e2e/                   # Playwright E2E tests
│   ├── admin/             #   Admin panel tests
│   └── storefront/        #   Customer storefront tests
├── packages/
│   ├── admin/             # React admin panel (Vite, port 5173)
│   ├── server/            # Express API server (port 3000)
│   ├── shared/            # Shared types and constants
│   └── storefront/        # React customer storefront (Vite, port 5174)
├── prisma/
│   ├── schema.prisma      # Database schema (20 models)
│   └── seed.ts            # Sample data seeder
├── docker-compose.yml     # PostgreSQL for local dev
├── playwright.config.ts   # E2E test configuration
└── PLAN.md                # Full feature roadmap
```

The project uses **npm workspaces** as a monorepo. All packages share a single `node_modules` and `package-lock.json` at the root.

---

## Getting Started

### Prerequisites

- **Node.js** 22+
- **Docker** (for PostgreSQL) or a local PostgreSQL instance
- **npm** 10+

### 1. Clone and install

```bash
git clone git@github.com:mighty840/kitchenasty.git
cd kitchenasty
npm install
```

### 2. Start the database

```bash
docker compose up -d
```

This starts PostgreSQL on `localhost:5432` with credentials `kitchenasty/kitchenasty`.

### 3. Set up environment

```bash
cp packages/server/.env.example packages/server/.env
```

The defaults work out of the box with the Docker Compose setup.

### 4. Run database migrations and seed

```bash
npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma
npx -w packages/server prisma db seed
```

### 5. Generate Prisma client

```bash
npx -w packages/server prisma generate --schema ../../prisma/schema.prisma
```

### 6. Start development servers

```bash
# Start all three in separate terminals:
npm run dev:server      # API server → http://localhost:3000
npm run dev:admin       # Admin panel → http://localhost:5173
npm run dev:storefront  # Storefront  → http://localhost:5174
```

---

## Commands

### Development

| Command | Description |
|---------|-------------|
| `npm run dev:server` | Start Express API server with hot reload |
| `npm run dev:admin` | Start admin panel dev server |
| `npm run dev:storefront` | Start storefront dev server |

### Testing

| Command | Description |
|---------|-------------|
| `npm test` | Run all unit + integration tests |
| `npm run test:unit` | Run unit tests only |
| `npm run test:integration` | Run integration tests only |
| `npm run test:e2e` | Run Playwright E2E tests (auto-starts dev servers) |

### Database

| Command | Description |
|---------|-------------|
| `docker compose up -d` | Start PostgreSQL |
| `docker compose down` | Stop PostgreSQL |
| `npx -w packages/server prisma migrate dev --schema ../../prisma/schema.prisma` | Run migrations |
| `npx -w packages/server prisma db seed` | Seed sample data |
| `npx -w packages/server prisma studio --schema ../../prisma/schema.prisma` | Open Prisma Studio GUI |

### Build

| Command | Description |
|---------|-------------|
| `npm run build` | Build all packages for production |

---

## CI Pipeline

The GitHub Actions workflow runs on every push to `main` and on pull requests:

| Job | Description |
|-----|-------------|
| **Lint** | TypeScript type-checking across all 4 packages |
| **Unit Tests** | Shared + server unit tests via Vitest |
| **Integration Tests** | API integration tests via Vitest + Supertest |
| **E2E Tests** | Playwright browser tests for admin and storefront |
| **Security Audit** | `npm audit` at high severity threshold |
| **Build** | Compiles all packages and uploads dist artifacts |

The **Build** job only runs after Lint, Unit, and Integration tests pass.

---

## Database Schema

20 models covering the full restaurant domain:

```
Location ─── OperatingHour, DeliveryZone, Table
    │
Category ─── MenuItem ─── MenuOption ─── MenuOptionValue
    │              │
    │         MenuItemMealtime, MenuItemAllergen
    │
Customer ─── Address, Order ─── OrderItem ─── OrderItemOption
    │              │
    │         Payment, Review
    │
    └── Reservation ─── Table

User (Staff) ─── Role (SUPER_ADMIN, MANAGER, STAFF)
Coupon, Allergen, Mealtime, CustomerGroup
```

---

## API Endpoints

### Auth
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/staff/login` | — | Staff login |
| POST | `/api/auth/staff/register` | Super Admin | Register new staff |
| POST | `/api/auth/customer/register` | — | Customer registration |
| POST | `/api/auth/customer/login` | — | Customer login |
| GET | `/api/auth/me` | Any | Current user info |

### Locations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations` | — | List locations (paginated) |
| GET | `/api/locations/:id` | — | Get location detail |
| POST | `/api/locations` | Manager+ | Create location |
| PATCH | `/api/locations/:id` | Manager+ | Update location |
| DELETE | `/api/locations/:id` | Super Admin | Delete location |

### Delivery Zones
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations/:id/delivery-zones` | — | List zones |
| POST | `/api/locations/:id/delivery-zones` | Manager+ | Create zone |
| PATCH | `/api/locations/:id/delivery-zones/:zoneId` | Manager+ | Update zone |
| DELETE | `/api/locations/:id/delivery-zones/:zoneId` | Super Admin | Delete zone |

### Tables
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/locations/:id/tables` | — | List tables for location |
| GET | `/api/locations/:id/tables/:tableId` | — | Get table detail |
| POST | `/api/locations/:id/tables` | Manager+ | Create table |
| PATCH | `/api/locations/:id/tables/:tableId` | Manager+ | Update table |
| DELETE | `/api/locations/:id/tables/:tableId` | Super Admin | Delete table |

### Menu — Categories
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/menu/categories` | — | List categories (with children) |
| GET | `/api/menu/categories/:id` | — | Get category with items |
| POST | `/api/menu/categories` | Manager+ | Create category |
| PATCH | `/api/menu/categories/:id` | Manager+ | Update category |
| DELETE | `/api/menu/categories/:id` | Super Admin | Delete category |

### Menu — Items
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/menu/items` | — | List items (paginated, filterable) |
| GET | `/api/menu/items/:id` | — | Get item with options/allergens |
| POST | `/api/menu/items` | Manager+ | Create item with options |
| PATCH | `/api/menu/items/:id` | Manager+ | Update item |
| DELETE | `/api/menu/items/:id` | Super Admin | Delete item |

### Menu — Allergens & Mealtimes
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/menu/allergens` | — | List allergens |
| POST | `/api/menu/allergens` | Manager+ | Create allergen |
| DELETE | `/api/menu/allergens/:id` | Super Admin | Delete allergen |
| GET | `/api/menu/mealtimes` | — | List mealtimes |
| POST | `/api/menu/mealtimes` | Manager+ | Create mealtime |
| PATCH | `/api/menu/mealtimes/:id` | Manager+ | Update mealtime |
| DELETE | `/api/menu/mealtimes/:id` | Super Admin | Delete mealtime |

### Orders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/orders` | Optional | Create order (guest or authenticated) |
| GET | `/api/orders` | Staff | List orders (paginated, filterable) |
| GET | `/api/orders/my-orders` | Customer | List customer's own orders |
| GET | `/api/orders/:id` | Any | Get order detail |
| PATCH | `/api/orders/:id/status` | Staff | Update order status |

### Payments
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/payments/create-intent` | Optional | Create Stripe payment intent |
| POST | `/api/payments/webhook` | — | Stripe webhook handler |
| POST | `/api/payments/cash` | Staff | Record cash payment |

### Dashboard
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/dashboard/stats` | Staff | Get dashboard metrics, recent orders, top items |

### Reviews
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reviews/location/:locationId` | — | Get approved reviews with average rating |
| POST | `/api/reviews` | Customer | Submit review |
| GET | `/api/reviews` | Staff | List all reviews (including unapproved) |
| PATCH | `/api/reviews/:id` | Staff | Moderate review (approve/reject) |
| DELETE | `/api/reviews/:id` | Manager+ | Delete review |

### Coupons
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/coupons/validate` | — | Validate coupon code and calculate discount |
| GET | `/api/coupons` | Staff | List all coupons |
| GET | `/api/coupons/:id` | Staff | Get coupon detail |
| POST | `/api/coupons` | Staff | Create coupon |
| PATCH | `/api/coupons/:id` | Staff | Update coupon |
| DELETE | `/api/coupons/:id` | Manager+ | Delete coupon |

### Reservations
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/reservations/availability` | — | Check time slot availability |
| GET | `/api/reservations/my-reservations` | Customer | List customer's reservations |
| POST | `/api/reservations` | Customer | Create reservation |
| GET | `/api/reservations` | Staff | List all reservations |
| GET | `/api/reservations/:id` | Any | Get reservation detail |
| PATCH | `/api/reservations/:id` | Staff | Update reservation (status, table) |
| DELETE | `/api/reservations/:id` | Staff | Delete reservation |

---

## Contributing

1. Create a feature branch from `main`: `git checkout -b feature/your-feature`
2. Make changes and add tests
3. Ensure all tests pass: `npm test && npm run test:e2e`
4. Push and open a pull request

### Branch Naming

- `feature/*` — New features
- `fix/*` — Bug fixes
- `chore/*` — Maintenance and tooling

---

## License

MIT
