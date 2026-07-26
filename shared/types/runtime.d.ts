import type { AppPermission } from '../rbac'

declare module 'bun:sqlite' {
  export const Database: {
    new (...args: unknown[]): {
      readonly __brand: 'BunSqliteDatabase'
    }
  }
}

declare module '@cloudflare/workers-types' {
  export interface D1Database {
    readonly __brand: 'CloudflareD1Database'
  }
}

declare module '#app' {
  interface PageMeta {
    public?: boolean
    permission?: AppPermission | AppPermission[]
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    permission?: AppPermission | AppPermission[]
  }
}

declare global {
  type Timer = ReturnType<typeof setTimeout>
}

export {}
