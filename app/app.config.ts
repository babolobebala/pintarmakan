export default defineAppConfig({
  appName: 'SmartFood KSB',
  ui: {
    colors: {
      primary: 'green',
      neutral: 'slate'
    },
    button: {
      slots: {
        base: 'rounded-[var(--radius-control)] font-medium transition-colors',
        label: 'truncate',
        leadingIcon: 'shrink-0',
        leadingAvatar: 'shrink-0',
        leadingAvatarSize: '',
        trailingIcon: 'shrink-0'
      }
    },
    card: {
      slots: {
        root: 'overflow-hidden rounded-[var(--radius-panel)]',
        header: 'p-5 sm:px-6',
        body: 'p-5 sm:p-6',
        footer: 'p-5 sm:px-6'
      },
      variants: {
        variant: {
          outline: {
            root: 'bg-[var(--app-surface)] ring ring-inset ring-[var(--app-border)]'
          },
          soft: {
            root: 'bg-[var(--app-surface-muted)] divide-y divide-[var(--app-border)]'
          },
          subtle: {
            root: 'bg-[var(--app-surface-muted)] ring ring-inset ring-[var(--app-border)]'
          }
        }
      }
    },
    input: {
      slots: {
        base: 'rounded-[var(--radius-control)] border border-[var(--app-border)] bg-[var(--app-surface)] text-[var(--app-foreground)] placeholder:text-[var(--app-foreground-soft)] shadow-none transition-colors'
      },
      defaultVariants: {
        color: 'neutral',
        variant: 'outline'
      }
    },
    formField: {
      slots: {
        label: 'block text-[0.72rem] uppercase tracking-[0.08em] text-[var(--app-foreground-soft)]',
        hint: 'text-[0.68rem] uppercase tracking-[0.08em] text-[var(--app-foreground-soft)]',
        description: 'text-[var(--app-foreground-muted)]',
        help: 'mt-2 text-[0.78rem] text-[var(--app-foreground-muted)]',
        error: 'mt-2 text-[0.78rem] text-error'
      }
    }
  }
})
