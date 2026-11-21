'use client'

import React from 'react'
import { UserPersona } from '@/services/authService'
import { rbacPolicyEngine } from '@/services/rbacRegistry'

interface PermissionGateProps {
  user: UserPersona | null | undefined
  permission?: string
  permissions?: string[]
  matchAll?: boolean
  fallback?: React.ReactNode
  children: React.ReactNode
}

/**
 * Declarative Authorization Gate (Policy Pattern).
 * Conditionally renders children if the user satisfies the configured permission policy.
 */
export function PermissionGate({
  user,
  permission,
  permissions,
  matchAll = false,
  fallback = null,
  children,
}: PermissionGateProps) {
  const reqPerms = permissions ?? (permission ? [permission] : [])
  if (reqPerms.length === 0) return <>{children}</>

  const isAllowed = matchAll
    ? rbacPolicyEngine.hasAllPermissions(user, reqPerms)
    : rbacPolicyEngine.hasAnyPermission(user, reqPerms)

  if (!isAllowed) {
    return <>{fallback}</>
  }

  return <>{children}</>
}
