import { UserPersona } from './authService';

/**
 * Canonical System Permissions.
 * Represents fine-grained operational capabilities rather than coarse role labels.
 */
export const Permissions = {
  // Public & Customer Capabilities
  VIEW_CATALOG: 'VIEW_MOVIES',
  VIEW_SHOWTIMES: 'VIEW_SHOWTIMES',
  CHAT_CONCIERGE: 'CHAT_CONCIERGE',
  BOOK_SEATS: 'BOOK_SEATS',
  ORDER_FNB: 'ORDER_FNB',
  VIEW_TICKETS: 'VIEW_TICKETS',
  VIP_EXPERIENCE: 'VIP_RECLINER_ACCESS',
  HEATED_SEATS: 'HEATED_SEATS',
  IN_SEAT_DELIVERY: 'IN_SEAT_DELIVERY',
  AGENT_ORCHESTRATE: 'AGENT_ORCHESTRATE',

  // Floor & Operational Staff Capabilities
  SCAN_GATE_PASS: 'SCAN_GATE_PASS',
  OVERRIDE_TURNSTILE: 'OVERRIDE_TURNSTILE',
  DISPATCH_FNB_ORDER: 'DISPATCH_FNB_ORDER',
  WAYFINDER_GUIDE: 'WAYFINDER_GUIDE',

  // Theater Management & Box Office Capabilities
  MANAGE_THEATRE: 'MANAGE_THEATRE',
  MANAGE_FNB_MENU: 'MANAGE_FNB_MENU',
  VIEW_BOX_OFFICE: 'VIEW_BOX_OFFICE',
  DYNAMIC_YIELD_SURGE: 'DYNAMIC_YIELD_SURGE',
  CATALOG_MUTATE: 'CATALOG_MUTATE',
  MANAGE_RBAC: 'MANAGE_RBAC',
  ADMIN_ACCESS: 'ADMIN_ACCESS',

  // Engineering, APM & LLMOps Capabilities
  APM_TRACES: 'APM_TRACES',
  LLMOPS_TELEMETRY: 'LLMOPS_TELEMETRY',
  RAG_INGESTION: 'RAG_INGESTION',
} as const;

export type PermissionKey = keyof typeof Permissions;
export type PermissionValue = (typeof Permissions)[PermissionKey];

/**
 * Route-to-Permission Mapping (Configurable Policy Matrix).
 * Defines the set of required permissions to access a given frontend route.
 * If multiple permissions are specified, possessing ANY of them grants access (OR policy).
 */
export const ROUTE_PERMISSION_POLICIES: Record<string, string[]> = {
  '/booking': [Permissions.VIEW_CATALOG],
  '/concessions': [Permissions.VIEW_CATALOG],
  '/chat': [Permissions.CHAT_CONCIERGE],
  '/tickets': [Permissions.VIEW_TICKETS, Permissions.SCAN_GATE_PASS],
  '/wallet': [Permissions.BOOK_SEATS, Permissions.ORDER_FNB],
  '/split': [Permissions.BOOK_SEATS, Permissions.ORDER_FNB],
  '/profile': [Permissions.VIEW_CATALOG],
  '/manager': [
    Permissions.MANAGE_THEATRE,
    Permissions.MANAGE_FNB_MENU,
    Permissions.MANAGE_RBAC,
    Permissions.DISPATCH_FNB_ORDER,
    Permissions.ADMIN_ACCESS,
  ],
  '/admin': [Permissions.ADMIN_ACCESS, Permissions.VIEW_BOX_OFFICE],
  '/agent': [Permissions.AGENT_ORCHESTRATE],
  '/tracing': [Permissions.APM_TRACES],
  '/analytics': [Permissions.LLMOPS_TELEMETRY],
  '/documents': [Permissions.RAG_INGESTION],
};

/**
 * Policy Specification Engine (Specification / Policy Pattern).
 */
export const rbacPolicyEngine = {
  hasPermission: (user: UserPersona | null | undefined, permission: string): boolean => {
    if (!user || !user.isAuthenticated || user.role === 'ANONYMOUS' || !user.permissions) {
      return false;
    }
    // Superuser role EXECUTIVE_ADMIN has blanket clearance
    if (user.role === 'EXECUTIVE_ADMIN') return true;
    return user.permissions.includes(permission);
  },

  hasAnyPermission: (user: UserPersona | null | undefined, permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.some((p) => rbacPolicyEngine.hasPermission(user, p));
  },

  hasAllPermissions: (user: UserPersona | null | undefined, permissions: string[]): boolean => {
    if (!permissions || permissions.length === 0) return true;
    return permissions.every((p) => rbacPolicyEngine.hasPermission(user, p));
  },

  canAccessRoute: (user: UserPersona | null | undefined, path: string): boolean => {
    const baseRoute = '/' + path.split('/').filter(Boolean)[0];
    const required = ROUTE_PERMISSION_POLICIES[baseRoute];
    if (!required || required.length === 0) return true;
    return rbacPolicyEngine.hasAnyPermission(user, required);
  },
};
