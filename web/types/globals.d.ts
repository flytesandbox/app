// web/types/globals.d.ts
import type { Permission, Role } from '../lib/permissions'

export {}

type ClerkRole = `org:${Role}`
type ClerkPermission = `org:${Permission}`

declare global {
  interface ClerkAuthorization {
    role: ClerkRole
    permission: ClerkPermission
  }
}