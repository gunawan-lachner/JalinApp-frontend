# Jalin App Frontend Documentation

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Technology Stack](#technology-stack)
4. [Project Structure](#project-structure)
5. [Authentication & Authorization](#authentication--authorization)
6. [API Integration](#api-integration)
7. [Key Features](#key-features)
8. [Components](#components)
9. [Pages & Routes](#pages--routes)
10. [Hooks & Utilities](#hooks--utilities)
11. [Development Guide](#development-guide)
12. [Configuration](#configuration)

---

## Overview

**Jalin App** is a comprehensive frontend application built with Next.js 15 and React 19, designed as a switching platform management system. The application provides a modern, responsive interface for managing transactions, routing, participants, databases, and various system configurations.

### Key Capabilities

- **Transaction Management**: Search, inspect, and troubleshoot transaction details
- **Routing Management**: Explore routing rules, simulate transactions, and analyze route effectiveness
- **Participant Management**: Manage issuers, acquirers, and related metadata
- **Database Tools**: Compare datasets, run queries, and view results
- **Gateway Management**: Monitor gateway performance and connectivity
- **System Administration**: Configure environments, users, and preferences
- **File Management**: Transfer files and manage system files
- **SSH Client**: Securely connect to servers directly from the app

---

## Architecture

### Application Structure

The application follows a modern Next.js App Router architecture with the following key patterns:

- **Client-Side Rendering**: Most pages use `"use client"` directive for interactive components
- **Server Components**: Layout and metadata are handled server-side
- **Context API**: Global state management for authentication and user data
- **Custom Hooks**: Reusable logic for API calls and business logic
- **Component Composition**: Modular, reusable UI components

### Key Architectural Decisions

1. **Route Protection**: Implemented via `RouteGate` component wrapping all routes
2. **API Abstraction**: Centralized API client in `lib/api.ts` with JWT authentication
3. **Type Safety**: Full TypeScript implementation with comprehensive type definitions
4. **UI Components**: shadcn/ui component library for consistent design system
5. **State Management**: React Context for auth, local state for component-specific data

---

## Technology Stack

### Core Technologies

- **Framework**: Next.js 15.5.6
- **React**: 19.x
- **TypeScript**: 5.x
- **Styling**: Tailwind CSS 3.4.17
- **UI Components**: Radix UI primitives with shadcn/ui
- **HTTP Client**: Axios 1.11.0
- **Form Handling**: React Hook Form 7.54.1 with Zod validation
- **Data Tables**: TanStack Table 8.21.3
- **Charts**: Recharts (latest)
- **Icons**: Lucide React 0.454.0, React Icons 5.5.0

### Key Dependencies

```json
{
  "@tanstack/react-table": "^8.21.3",
  "axios": "^1.11.0",
  "date-fns": "4.1.0",
  "lucide-react": "^0.454.0",
  "next": "^15.5.6",
  "next-themes": "^0.4.4",
  "react": "^19",
  "react-dom": "^19",
  "react-hook-form": "^7.54.1",
  "zod": "^3.24.1"
}
```

---

## Project Structure

```
Jalin App v2/
├── app/                          # Next.js App Router pages
│   ├── page.tsx                  # Dashboard/Home page
│   ├── layout.tsx                # Root layout with auth providers
│   ├── login/                    # Authentication page
│   ├── transaction/              # Transaction management
│   ├── transaction-routing/      # Routing rules and analysis
│   ├── routing-simulation/       # Transaction simulation
│   ├── participant/              # Participant management
│   ├── database/                 # Database tools and comparisons
│   ├── queries/                  # SQL query builder
│   ├── gateway/                  # Gateway management
│   ├── settings/                 # System settings
│   ├── file-manager/             # File management
│   ├── file-transfer/            # File transfer operations
│   ├── ssh-client/               # SSH terminal client
│   ├── log-extractor/            # Log extraction tools
│   ├── network-message/          # Network message viewer
│   ├── connections/              # Connection profiles
│   └── compare/                  # Comparison tools
│
├── components/                   # React components
│   ├── auth/                     # Authentication components
│   │   ├── protected-route.tsx
│   │   └── route-gate.tsx
│   ├── layout/                   # Layout components
│   │   └── sidebar.tsx
│   ├── rna/                      # RNA-specific components
│   │   ├── transaction-table.tsx
│   │   ├── participant-table.tsx
│   │   ├── route-table.tsx
│   │   └── ...
│   ├── database/                 # Database comparison components
│   ├── settings/                 # Settings page components
│   ├── transaction/              # Transaction components
│   └── ui/                       # shadcn/ui components (57 files)
│
├── contexts/                     # React contexts
│   └── auth-context.tsx          # Authentication context
│
├── hooks/                        # Custom React hooks
│   ├── useRnaApi.ts              # RNA API hook
│   ├── useCrudPermissions.ts     # CRUD permissions hook
│   ├── use-mobile.tsx            # Mobile detection hook
│   └── use-toast.ts              # Toast notifications hook
│
├── lib/                          # Core libraries and utilities
│   ├── api.ts                    # Main API client (3000+ lines)
│   ├── auth.ts                   # Authentication utilities
│   ├── types.ts                  # TypeScript type definitions
│   └── utils.ts                  # Utility functions
│
├── public/                       # Static assets
│   └── images/                   # Image files
│
└── styles/                       # Global styles
    └── globals.css
```

---

## Authentication & Authorization

### Authentication Flow

1. **Login Process**:

   - User submits credentials via `/login` page
   - API validates credentials and returns JWT token
   - Token stored in localStorage via `tokenManager`
   - User data and accessible pages fetched
   - Redirect to dashboard

2. **Token Management**:

   - JWT tokens stored in localStorage
   - Automatic token inclusion in API requests
   - Token validation on app initialization
   - Automatic logout on token expiration

3. **Route Protection**:
   - `RouteGate` component wraps all routes
   - Checks authentication status
   - Validates page access permissions
   - Redirects to login if unauthorized

### Authorization System

The application implements role-based access control (RBAC) with the following features:

- **Page-Level Access**: Users only see pages they have permission to access
- **CRUD Permissions**: Separate flag for Create, Read, Update, Delete operations
- **Dynamic Navigation**: Sidebar dynamically shows only accessible pages
- **API-Level Enforcement**: Backend validates permissions for all operations

### Key Components

#### `AuthContext` (`contexts/auth-context.tsx`)

Provides global authentication state:

```typescript
interface AuthContextType {
  user: AuthUser | null;
  accessiblePages: AccessiblePage[];
  isAuthenticated: boolean;
  loading: boolean;
  canCrud: boolean;
  login: (username: string, password: string) => Promise<LoginResponse>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  hasPageAccess: (path: string) => boolean;
  refreshAccessiblePages: () => Promise<void>;
  hasCrudPermission: () => boolean;
}
```

#### `TokenManager` (`lib/auth.ts`)

Manages JWT tokens and CRUD permissions:

- `getToken()`: Retrieves stored JWT token
- `setToken(token)`: Stores JWT token
- `clearToken()`: Removes JWT token
- `getCrudPermission()`: Checks CRUD permission flag
- `setCrudPermission(canCrud)`: Sets CRUD permission

---

## API Integration

### API Client Architecture

The application uses a centralized API client located in `lib/api.ts` (3000+ lines) with the following structure:

#### Base Configuration

```typescript
const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000/api";
const API_TIMEOUT = 30000; // 30 seconds
```

#### Authentication

All API requests automatically include JWT token in the Authorization header:

```typescript
headers: {
  "Authorization": `Bearer ${token}`,
  "Content-Type": "application/json"
}
```

### API Modules

#### 1. Authentication API (`authApi`)

Located in `lib/auth.ts`:

- `login(username, password)`: User authentication
- `getCurrentUser()`: Fetch current user data
- `getUserPages()`: Get accessible pages for user
- `getAllUsers()`: List all users (admin)
- `getAllRoles()`: List all roles (admin)
- `createRole(roleData)`: Create new role
- `updateRole(roleId, roleData)`: Update role
- `deleteRole(roleId)`: Delete role

#### 2. RNA API (`rnaApi`)

Located in `lib/api.ts`, provides comprehensive API methods:

**Connection Profiles**:

- `getConnectionProfiles()`: List all connection profiles
- `createConnectionProfile(profile)`: Create new profile
- `updateConnectionProfile(name, profile)`: Update profile
- `deleteConnectionProfile(name)`: Delete profile
- `testConnection(profileId)`: Test database connection

**Transactions**:

- `searchTransactions(params)`: Search transactions with filters
- `getTransactionDetails(profileId, transactionId)`: Get transaction details
- `getTransactionAttributes(profileId, transactionId)`: Get transaction attributes
- `getTransactionEndpoints(profileId, uuid)`: Get transaction endpoints
- `getGrayLogData(profileId, transactionId)`: Get Graylog data
- `saveTransactions(request)`: Save transactions for later
- `getSavedTransactions()`: List saved transactions
- `exportTransactions(transactions, format)`: Export transactions

**Participants**:

- `getParticipants(params)`: Search participants
- `getContainerPluginDetails(params)`: Get container plugin details
- `getParticipantDuplicateInfo(params)`: Get participant duplication info
- `duplicateParticipant(request)`: Duplicate participant

**Gateways & BIN Routing**:

- `getGateways(params)`: Search gateways
- `createGateway(request)`: Create gateway
- `updateGateway(gatewayId, request)`: Update gateway
- `deleteGateway(gatewayId, connection)`: Delete gateway
- `getGatewayBins(gatewayId, params)`: Get gateway BINs
- `listBinRoutes(request)`: List BIN routing rules
- `createBinRoute(payload)`: Create BIN route
- `updateBinRoute(routeId, payload)`: Update BIN route
- `deleteBinRoute(routeId, connection)`: Delete BIN route

**Database Tools**:

- `getSourceTables(profile)`: List database tables
- `getTableColumns(profile, table)`: Get table columns
- `compareTables(request)`: Compare tables between databases
- `exportCompareResults(results, format)`: Export comparison results

### Custom Hooks

#### `useRnaApi` Hook

Located in `hooks/useRnaApi.ts`, provides a convenient wrapper around API calls:

```typescript
const {
  loading,
  error,
  clearError,
  getConnectionProfiles,
  searchTransactions,
  getParticipants,
  // ... many more methods
} = useRnaApi();
```

Features:

- Automatic loading state management
- Error handling
- Request caching to prevent duplicate calls
- Success/error callbacks

---

## Key Features

### 1. Transaction Management

**Location**: `/transaction`

Features:

- Advanced search with multiple filters
- Date range selection
- Real-time transaction search
- Transaction details modal
- Transaction flow visualization
- Graylog integration
- Save transactions for later
- Export to CSV
- Pagination support

**Key Components**:

- `TransactionTable`: Main transaction data table
- `TransactionFilters`: Advanced filtering UI
- `TransactionDetailsModal`: Detailed transaction view
- `TransactionFlowModal`: Transaction flow visualization

### 2. Transaction Routing

**Location**: `/transaction-routing`

Features:

- BIN routing rule management
- Route priority management
- Gateway assignment
- Participant mapping
- Route search and filtering
- Route details view
- Export routing rules

**Key Components**:

- `RouteTable`: Routing rules table
- `RouteDetailsModal`: Route configuration details

### 3. Routing Simulation

**Location**: `/routing-simulation`

Features:

- Transaction simulation
- Route matching validation
- Syntax validation
- Test transaction outcomes
- Real-time route matching

**Key Components**:

- `RoutingSimulationPanel`: Main simulation interface

### 4. Participant Management

**Location**: `/participant`

Features:

- Participant search and filtering
- Participant details view
- Container plugin management
- Participant duplication
- Online configuration management
- Active/inactive status management

**Key Components**:

- `ParticipantTable`: Participant data table
- `ParticipantFilters`: Filtering interface
- `ParticipantDuplicateModal`: Duplication wizard
- `ContainerPluginDetailsModal`: Plugin configuration

### 5. Database Tools

**Location**: `/database`

Features:

- Database comparison
- Schema comparison
- Data comparison
- Table column mapping
- Comparison queue management
- Results export (CSV, Excel)
- Query mode support

**Key Components**:

- `ComparisonSetup`: Comparison configuration
- `ComparisonOptions`: Comparison options
- `ComparisonQueue`: Queue management
- `ComparisonResults`: Results display
- `ResultsModal`: Detailed results view

### 6. Gateway Management

**Location**: `/gateway`

Features:

- Gateway listing and search
- Gateway creation and editing
- BIN management per gateway
- Gateway status monitoring
- BIN routing configuration

### 7. Settings

**Location**: `/settings`

Features organized in tabs:

- **General Settings**: Application preferences
- **User Management**: User CRUD operations
- **Page Management**: Page access control
- **Security Settings**: Security configurations
- **Graylog Config**: Graylog integration settings
- **Graylog Rules**: Log parsing rules
- **SSH Snippet**: SSH connection snippets
- **System Settings**: System-wide configurations

**Key Components**:

- `GeneralSettingsTab`
- `UserManagementTab`
- `PageManagementTab`
- `SecuritySettingsTab`
- `GraylogConfigTab`
- `GraylogRulesTab`
- `SSHSnippetTab`
- `SystemSettingsTab`

### 8. File Management

**Locations**: `/file-manager`, `/file-transfer`

Features:

- File browser
- File upload/download
- File transfer operations
- Connection-based file access

### 9. SSH Client

**Location**: `/ssh-client`

Features:

- Secure SSH connections
- Terminal interface
- Connection profiles
- Multiple session support

### 10. Query Builder

**Location**: `/queries`

Features:

- SQL query builder
- Query execution
- Query saving
- Query sharing
- Results visualization

---

## Components

### Layout Components

#### `Sidebar` (`components/layout/sidebar.tsx`)

Main navigation sidebar with:

- Dynamic page list based on user permissions
- Collapsible/expandable state
- User profile display
- Active route highlighting
- Scroll position persistence
- Logout functionality

**Features**:

- Responsive design
- Icon support (Feather icons from backend or Lucide icons)
- Badge display for user roles
- Smooth animations

### Authentication Components

#### `RouteGate` (`components/auth/route-gate.tsx`)

Protects routes by:

- Checking authentication status
- Validating page access permissions
- Redirecting unauthorized users
- Handling loading states

#### `ProtectedRoute` (`components/auth/protected-route.tsx`)

Additional route protection wrapper (if needed).

### RNA Components

Located in `components/rna/`:

- **Transaction Components**:

  - `TransactionTable`: Data table with sorting, filtering, pagination
  - `TransactionFilters`: Advanced filter UI
  - `TransactionDetailsModal`: Transaction detail view
  - `TransactionFlowModal`: Transaction flow diagram
  - `TransactionInsights`: Analytics and insights

- **Participant Components**:

  - `ParticipantTable`: Participant data table
  - `ParticipantFilters`: Filtering interface
  - `ParticipantDuplicateModal`: Duplication wizard
  - `ContainerPluginDetailsModal`: Plugin details

- **Routing Components**:
  - `RouteTable`: Routing rules table
  - `RouteDetailsModal`: Route configuration
  - `RoutingSimulationPanel`: Simulation interface

### Database Components

Located in `components/database/`:

- `ComparisonSetup`: Initial comparison configuration
- `ComparisonHero`: Hero section for comparison page
- `ComparisonOptions`: Comparison options selection
- `ComparisonQueue`: Queue management interface
- `ComparisonExecution`: Execution progress
- `ComparisonResults`: Results display
- `ResultsModal`: Detailed results modal
- `StepIndicator`: Multi-step wizard indicator

### UI Components

Located in `components/ui/` (57 components):

Built on Radix UI primitives with shadcn/ui:

- **Form Components**: Button, Input, Select, Checkbox, Radio, Switch, Textarea
- **Layout Components**: Card, Separator, Tabs, Accordion, Collapsible
- **Feedback Components**: Alert, Toast, Dialog, Alert Dialog, Progress, Skeleton
- **Navigation Components**: Breadcrumb, Navigation Menu, Pagination
- **Data Display**: Table, Badge, Avatar, Tooltip, Hover Card
- **Overlay Components**: Popover, Sheet, Drawer, Command
- **Advanced**: Calendar, Chart, Carousel, Resizable Panels

All components are fully typed and customizable via Tailwind CSS.

---

## Pages & Routes

### Dashboard (`/`)

**File**: `app/page.tsx`

Main dashboard showing:

- Welcome message with user info
- Quick access to all available pages
- Role-based page visibility
- System statistics (placeholder)

### Login (`/login`)

**File**: `app/login/page.tsx`

Authentication page with:

- Username/password form
- Error handling
- Redirect to dashboard on success
- JWT token management

### Transaction Pages

#### Transaction Management (`/transaction`)

**File**: `app/transaction/page.tsx`

Main transaction search and management interface.

#### Transaction Routing (`/transaction-routing`)

**File**: `app/transaction-routing/page.tsx`

BIN routing rule management and analysis.

#### Routing Simulation (`/routing-simulation`)

**File**: `app/routing-simulation/page.tsx`

Transaction routing simulation tool.

### Participant Management (`/participant`)

**File**: `app/participant/page.tsx`

Participant search, management, and duplication.

### Database Pages

#### Database Tools (`/database`)

**File**: `app/database/page.tsx`

Main database tools interface.

#### Database Comparison (`/database/compare`)

**File**: `app/database/compare/page.tsx`

Database comparison tool with multi-step wizard.

### Gateway Management (`/gateway`)

**File**: `app/gateway/page.tsx`

Gateway and BIN management interface.

### Settings (`/settings`)

**File**: `app/settings/page.tsx`

Comprehensive settings interface with tabbed navigation.

### File Management

#### File Manager (`/file-manager`)

**File**: `app/file-manager/page.tsx`

File browser and management interface.

#### File Transfer (`/file-transfer`)

**File**: `app/file-transfer/page.tsx`

File transfer operations interface.

### Additional Pages

- **Queries** (`/queries`): SQL query builder
- **SSH Client** (`/ssh-client`): SSH terminal interface
- **Log Extractor** (`/log-extractor`): Log extraction tools
- **Network Message** (`/network-message`): Network message viewer
- **Connections** (`/connections`): Connection profile management
- **Compare** (`/compare`): General comparison tools

All pages include corresponding `loading.tsx` files for Next.js loading states.

---

## Hooks & Utilities

### Custom Hooks

#### `useRnaApi` (`hooks/useRnaApi.ts`)

Comprehensive API hook providing:

- All RNA API methods
- Loading state management
- Error handling
- Request caching
- Success/error callbacks

**Usage**:

```typescript
const { searchTransactions, loading, error } = useRnaApi();

searchTransactions(
  { connectionId, dateStart, dateEnd, filters, page, pageSize },
  (data) => {
    // Handle success
  },
  (error) => {
    // Handle error
  }
);
```

#### `useCrudPermissions` (`hooks/useCrudPermissions.ts`)

Hook for checking CRUD permissions:

- Checks user's CRUD capability
- Provides permission flags
- Updates on auth state changes

#### `useAuth` (`contexts/auth-context.tsx`)

Authentication context hook:

- Access to user data
- Login/logout functions
- Page access checking
- CRUD permission checking

**Usage**:

```typescript
const { user, isAuthenticated, canCrud, login, logout } = useAuth();
```

#### `use-mobile` (`hooks/use-mobile.tsx`)

Mobile device detection hook.

#### `use-toast` (`hooks/use-toast.ts`)

Toast notification hook using Sonner.

### Utility Functions

#### `lib/utils.ts`

Common utility functions:

- `cn()`: Class name merging utility (clsx + tailwind-merge)
- Other helper functions

#### `lib/types.ts`

Comprehensive TypeScript type definitions:

- User types
- Transaction types
- Participant types
- API response types
- Form data types
- And many more

---

## Development Guide

### Prerequisites

- Node.js 18+ (recommended: 22+)
- npm, yarn, or pnpm
- TypeScript knowledge
- React/Next.js experience

### Getting Started

1. **Install Dependencies**:

   ```bash
   npm install
   # or
   pnpm install
   # or
   yarn install
   ```

2. **Environment Variables**:
   Create a `.env.local` file:

   ```env
   NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
   NEXT_PUBLIC_API_TIMEOUT=30000
   ```

3. **Run Development Server**:

   ```bash
   npm run dev
   # or
   pnpm dev
   # or
   yarn dev
   ```

4. **Build for Production**:
   ```bash
   npm run build
   npm start
   ```

### Code Style

- **TypeScript**: Strict mode enabled
- **Formatting**: Prettier (recommended)
- **Linting**: ESLint with Next.js config
- **Components**: Functional components with hooks
- **Naming**: PascalCase for components, camelCase for functions

### Adding New Features

1. **New Page**:

   - Create page in `app/[feature-name]/page.tsx`
   - Add loading state in `app/[feature-name]/loading.tsx`
   - Update sidebar navigation (if needed)
   - Add route to backend permissions

2. **New Component**:

   - Create in appropriate `components/` subdirectory
   - Use TypeScript interfaces for props
   - Follow existing component patterns
   - Use shadcn/ui components when possible

3. **New API Endpoint**:
   - Add method to `lib/api.ts` (rnaApi or authApi)
   - Add corresponding hook method in `hooks/useRnaApi.ts`
   - Define types in `lib/types.ts`
   - Handle errors appropriately

### Testing

- Manual testing recommended
- Test authentication flows
- Test permission-based access
- Test API error handling
- Test responsive design

### Debugging

- Use React DevTools
- Check browser console for errors
- Verify API responses in Network tab
- Check localStorage for token/auth state
- Review Next.js server logs

---

## Configuration

### Environment Variables

| Variable                   | Description              | Default                 |
| -------------------------- | ------------------------ | ----------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | Backend API base URL     | `http://localhost:8000` |
| `NEXT_PUBLIC_API_TIMEOUT`  | API request timeout (ms) | `30000`                 |

### Build Configuration

**Next.js Config** (`next.config.mjs`):

- Output: Static export (if configured)
- Image optimization
- TypeScript strict mode

**TypeScript Config** (`tsconfig.json`):

- Strict mode enabled
- Path aliases configured (`@/` → `./`)
- React JSX support

**Tailwind Config** (`tailwind.config.ts`):

- Custom theme configuration
- shadcn/ui integration
- Animation utilities

### API Configuration

The API client is configured in `lib/api.ts`:

- Base URL from environment variable
- Automatic JWT token inclusion
- Request/response interceptors
- Error handling
- Timeout configuration

### Authentication Configuration

Authentication is configured in `lib/auth.ts`:

- Token storage: localStorage
- Token key: `jwt_token`
- CRUD permission key: `can_crud`
- Accessible pages cache: `accessible_pages`

---

## Best Practices

### Component Development

1. **Use TypeScript**: Always type props and state
2. **Extract Logic**: Use custom hooks for complex logic
3. **Error Handling**: Always handle API errors gracefully
4. **Loading States**: Show loading indicators for async operations
5. **Accessibility**: Use semantic HTML and ARIA attributes

### API Integration

1. **Use Hooks**: Prefer `useRnaApi` over direct API calls
2. **Error Handling**: Always provide error callbacks
3. **Loading States**: Manage loading states properly
4. **Caching**: Leverage built-in request caching
5. **Type Safety**: Use TypeScript interfaces for API responses

### State Management

1. **Context for Global State**: Use React Context for auth/user data
2. **Local State for UI**: Use useState for component-specific state
3. **Avoid Prop Drilling**: Use Context or composition
4. **Optimize Re-renders**: Use useCallback and useMemo appropriately

### Performance

1. **Code Splitting**: Next.js handles this automatically
2. **Image Optimization**: Use Next.js Image component
3. **Lazy Loading**: Load heavy components lazily
4. **Memoization**: Memoize expensive computations
5. **Request Caching**: Use built-in caching in useRnaApi

---

## Troubleshooting

### Common Issues

1. **Authentication Errors**:

   - Check token in localStorage
   - Verify API base URL
   - Check CORS settings on backend
   - Verify token expiration

2. **Page Access Denied**:

   - Check user permissions in backend
   - Verify accessible pages API response
   - Clear localStorage and re-login

3. **API Errors**:

   - Check network tab for actual requests
   - Verify API endpoint URLs
   - Check request/response formats
   - Review backend logs

4. **Build Errors**:
   - Clear `.next` directory
   - Reinstall dependencies
   - Check TypeScript errors
   - Verify environment variables

### Debug Tips

- Use React DevTools to inspect component state
- Check browser console for errors and warnings
- Use Network tab to inspect API requests
- Review Next.js server logs
- Check localStorage for auth state
- Verify environment variables are loaded

---

## Contributing

### Code Organization

- Keep components focused and single-purpose
- Extract reusable logic into hooks
- Use TypeScript for type safety
- Follow existing code patterns
- Document complex logic

### Git Workflow

1. Create feature branch
2. Make changes
3. Test thoroughly
4. Commit with clear messages
5. Push and create pull request

---

## License

[Specify license if applicable]

---

## Support

For issues, questions, or contributions, please contact the development team or create an issue in the repository.

---

**Last Updated**: [Current Date]
**Version**: 0.1.0
**Maintained by**: Ayash
