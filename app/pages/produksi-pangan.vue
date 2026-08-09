<script setup lang="ts">
import { appPermissions } from '~~/auth/permissions'

definePageMeta({
  permission: appPermissions.dashboardRead
})

await navigateTo({
  path: '/',
  query: {
    indicator: 'produksi-pangan'
  }
}, {
  replace: true
})
</script>
