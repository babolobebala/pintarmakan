declare module 'bun:sqlite' {
  export class Database {
    constructor(...args: unknown[])

    readonly __brand: 'BunSqliteDatabase'
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
    permission?: import('../../auth/permissions').AppAccessRequest
  }
}

declare module 'vue-router' {
  interface RouteMeta {
    public?: boolean
    permission?: import('../../auth/permissions').AppAccessRequest
  }
}

type Timer = ReturnType<typeof setTimeout>
