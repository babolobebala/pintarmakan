<script setup lang="ts">
import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

await navigateTo({
  path: '/',
  query: {
    dashboard: 'produksi-ketersediaan'
  }
}, {
  replace: true
})
</script>
