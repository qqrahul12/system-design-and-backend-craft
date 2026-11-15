'use client'

import React, { useState, useEffect, ReactNode } from 'react'
import Link from 'next/link'
import { Lock, ShieldCheck, Key, User, Loader2 } from 'lucide-react'
import { authService, UserPersona } from '@/services/authService'

export interface RbacAccessShieldProps {
  /** Section or page heading */
  title?: string
  /** Single role required */
  requiredRole?: string
  /** Multiple allowed roles (OR logic - user must have at least one) */
  requiredRoles?: string[]
  /** Specific permission required */
  requiredPermission?: string
  /** Explicit authentication requirement (default: true if role/permission passed) */
  requiresAuth?: boolean
  /** Optional pre-fetched user. If omitted, RbacAccessShield manages session state internally */
  currentUser?: UserPersona | null
  /** Optional custom explanation copy */
  description?: string
  /** Optional custom fallback component when access denied (e.g. for in-page widgets) */
  fallback?: ReactNode
  /** Wrapped page or section content rendered when access is granted */
  children?: ReactNode
  /** Callback invoked when role elevation succeeds */
  onRoleSwitched?: () => void
}

/**
 * Universal Role-Based Access Control (RBAC) Guard & Declarative Wrapper.
 *
 * <p>Usage as a Declarative Page Wrapper:
 * <pre>{@code
 * export default function ExecutivePage() {
 *   return (
 *     <RbacAccessShield requiredRoles={['EXECUTIVE_ADMIN']}>
 *       <ExecutiveDashboardContent />
 *     </RbacAccessShield>
 *   );
 * }
 * }</pre>
 *
 * <p>Usage as a Conditional Fallback Component:
 * <pre>{@code
 * if (!isAuthorized) {
 *   return <RbacAccessShield requiredRole="CINEMA_MANAGER" currentUser={user} />;
 * }
 * }</pre>
 */
export function RbacAccessShield({
  title = 'Access Clearance Required',
  requiredRole,
  requiredRoles,
  requiredPermission,
  requiresAuth = true,
  currentUser: propUser,
  description,
  fallback,
  children,
  onRoleSwitched,
}: RbacAccessShieldProps) {
  const [internalUser, setInternalUser] = useState<UserPersona | null>(propUser ?? null)
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(propUser === undefined)
  const [isSwitching, setIsSwitching] = useState<boolean>(false)

  // Determine allowed roles
  const targetRoles = requiredRoles || (requiredRole ? [requiredRole] : [])

  // Sync propUser if passed
  useEffect(() => {
    if (propUser !== undefined) {
      setInternalUser(propUser)
      setIsLoadingAuth(false)
    }
  }, [propUser])

  // Internal session fetch if no propUser provided
  useEffect(() => {
    if (propUser !== undefined) return

    let isMounted = true
    const loadSession = async () => {
      try {
        const u = await authService.getCurrentUser()
        if (isMounted) setInternalUser(u)
      } catch {
        if (isMounted) setInternalUser(null)
      } finally {
        if (isMounted) setIsLoadingAuth(false)
      }
    }

    loadSession()

    const handleAuthChange = () => {
      loadSession()
    }

    if (typeof window !== 'undefined') {
      window.addEventListener('cinemind-auth-changed', handleAuthChange)
    }

    return () => {
      isMounted = false
      if (typeof window !== 'undefined') {
        window.removeEventListener('cinemind-auth-changed', handleAuthChange)
      }
    }
  }, [propUser])

  const user = propUser !== undefined ? propUser : internalUser

  // Evaluate authorization
  const isAuthenticated = Boolean(
    user && user.isAuthenticated && user.role !== 'ANONYMOUS'
  )

  const hasRoleMatch =
    targetRoles.length === 0 ||
    (user && user.role && targetRoles.includes(user.role))

  const hasPermissionMatch =
    !requiredPermission ||
    (user && user.permissions && user.permissions.includes(requiredPermission))

  const isAuthorized =
    (!requiresAuth || isAuthenticated) && hasRoleMatch && hasPermissionMatch

  // Quick 1-click role switcher
  const handleSwitch = async (roleName: string) => {
    setIsSwitching(true)
    try {
      const switched = await authService.switchRole(roleName)
      setInternalUser(switched)
      if (onRoleSwitched) {
        onRoleSwitched()
      } else if (typeof window !== 'undefined') {
        window.location.reload()
      }
    } catch {
    } finally {
      setIsSwitching(false)
    }
  }

  // 1. If wrapped children provided and access granted: render children directly
  if (children && isAuthorized) {
    return <>{children}</>
  }

  // 2. While loading session state: render non-flicker loading placeholder
  if (children && isLoadingAuth) {
    return (
      <div className="mx-auto max-w-xl py-24 px-4 text-center space-y-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-900/20 border border-purple-500/30 text-purple-400 animate-pulse">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
        <p className="text-xs font-mono text-zinc-400">Verifying RBAC clearance credentials...</p>
      </div>
    )
  }

  // 3. Custom fallback override (e.g. for scoped widgets)
  if (children && fallback !== undefined) {
    return <>{fallback}</>
  }

  // 4. Default: Render the Shield banner with 1-click elevation buttons
  const activeRoleDisplay = user?.roleDisplayName || user?.role || 'Guest (Not Signed In)'
  const requiredRolesDisplay = targetRoles.length > 0 ? targetRoles.join(' or ') : 'Authenticated Session'

  return (
    <div className="mx-auto max-w-2xl py-12 px-4 space-y-6">
      <div className="rounded-3xl border border-amber-500/30 bg-gradient-to-b from-amber-950/20 via-zinc-900 to-zinc-950 p-8 text-center space-y-6 shadow-2xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 shadow-lg shadow-amber-500/10">
          <Lock className="h-8 w-8" />
        </div>

        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-xs font-semibold text-amber-300 uppercase tracking-wider">
            <ShieldCheck className="h-3.5 w-3.5 text-amber-400" />
            Restricted Operations Zone
          </div>
          <h2 className="text-2xl font-black text-white">{title}</h2>
          <p className="text-xs text-zinc-400 max-w-lg mx-auto leading-relaxed">
            {description || (
              <>
                You are currently signed in as{' '}
                <span className="font-semibold text-white">
                  {user?.fullName || user?.name || 'Guest Visitor'}
                </span>{' '}
                (
                <span className="text-amber-400 font-semibold">{activeRoleDisplay}</span>
                ). Access to this section requires{' '}
                <span className="text-purple-400 font-semibold font-mono">
                  {requiredRolesDisplay}
                </span>{' '}
                clearance.
              </>
            )}
          </p>
        </div>

        <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 text-left space-y-3 max-w-md mx-auto">
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Active Identity:</span>
            <span className="font-mono text-zinc-300 font-bold">{user?.role || 'ANONYMOUS'}</span>
          </div>
          <div className="flex items-center justify-between text-xs">
            <span className="text-zinc-500">Required Clearance:</span>
            <span className="font-mono text-purple-400 font-bold">
              {targetRoles.length > 0 ? targetRoles.join(' / ') : requiredPermission || 'AUTHENTICATED'}
            </span>
          </div>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          {targetRoles.map((role) => (
            <button
              key={role}
              onClick={() => handleSwitch(role)}
              disabled={isSwitching}
              className="flex items-center justify-center gap-2 rounded-xl bg-purple-600 hover:bg-purple-500 px-5 py-2.5 text-xs font-bold text-white shadow-lg shadow-purple-600/30 transition active:scale-95 disabled:opacity-50"
            >
              {isSwitching ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Key className="h-4 w-4" />
              )}
              Switch to {role.split('_').map((w) => w.charAt(0) + w.slice(1).toLowerCase()).join(' ')}
            </button>
          ))}

          <Link
            href="/login"
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800 hover:bg-zinc-700 px-5 py-2.5 text-xs font-semibold text-zinc-200 transition"
          >
            <User className="h-4 w-4" />
            Sign In / Persona Hub
          </Link>
        </div>
      </div>
    </div>
  )
}
