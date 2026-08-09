<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { Member, RoleOption } from "~/types";

const props = withDefaults(
  defineProps<{
    member?: Member | null;
    showTrigger?: boolean;
    canManagePassword?: boolean;
    canManageStatus?: boolean;
  }>(),
  {
    member: null,
    showTrigger: true,
    canManagePassword: false,
    canManageStatus: false,
  },
);

const emit = defineEmits<{
  created: [];
  updated: [];
  password: [member: Member];
  status: [member: Member];
}>();

const open = defineModel<boolean>("open", { default: false });
const toast = useToast();

const { data: roles } = await useFetch<RoleOption[]>("/api/roles/options", {
  default: () => [],
});

const roleOptions = computed(() => roles.value);
const roleSlugs = computed(() => roleOptions.value.map((role) => role.slug));

const schema = z.object({
  name: z.string().min(2, "Too short"),
  email: z.email("Invalid email"),
  password: z.union([
    z.literal(""),
    z.string().min(8, "Password must be at least 8 characters"),
  ]),
  roles: z
    .array(z.string())
    .min(1, "Select at least one role")
    .superRefine((value, ctx) => {
      const availableRoles = new Set(roleSlugs.value);

      for (const role of value) {
        if (!availableRoles.has(role)) {
          ctx.addIssue({
            code: "custom",
            message: "Select a valid role.",
          });
          return;
        }
      }
    }),
});

type Schema = z.output<typeof schema>;

const state = reactive<Schema>({
  name: "",
  email: "",
  password: "",
  roles: ["user"],
});

const loading = ref(false);
const isEdit = computed(() => !!props.member);
const modalTitle = computed(() =>
  isEdit.value ? "Edit member" : "Add member",
);
const modalDescription = computed(() => {
  return isEdit.value
    ? "Update the member profile, email, and assigned roles."
    : "Create an internal user record and assign one or more roles.";
});
const submitLabel = computed(() =>
  isEdit.value ? "Save changes" : "Add member",
);
const defaultRoles = computed(() => {
  if (roleSlugs.value.length === 0) {
    return [];
  }

  return roleSlugs.value.includes("user")
    ? ["user"]
    : roleSlugs.value.slice(0, 1);
});

function syncState() {
  if (props.member) {
    state.name = props.member.name;
    state.email = props.member.email;
    state.password = "";
    state.roles = props.member.roles.filter((role) =>
      roleSlugs.value.includes(role),
    );

    if (state.roles.length === 0) {
      state.roles = defaultRoles.value;
    }

    return;
  }

  state.name = "";
  state.email = "";
  state.password = "";
  state.roles = [...defaultRoles.value];
}

watch(
  roleSlugs,
  (value) => {
    if (value.length === 0) {
      state.roles = [];
      return;
    }

    state.roles = state.roles.filter((role) => value.includes(role));

    if (state.roles.length === 0) {
      const fallbackRole = value.includes("user") ? "user" : value[0];
      state.roles = fallbackRole ? [fallbackRole] : [];
    }
  },
  { immediate: true },
);

watch(
  [open, () => props.member],
  ([isOpen]) => {
    if (isOpen) {
      syncState();
    }
  },
  { immediate: true },
);

async function onSubmit(event: FormSubmitEvent<Schema>) {
  loading.value = true;

  try {
    await $fetch(
      isEdit.value && props.member
        ? `/api/members/${props.member.id}`
        : "/api/members",
      {
        method: isEdit.value ? "PATCH" : "POST",
        body: isEdit.value
          ? {
              name: event.data.name,
              email: event.data.email,
              roles: event.data.roles,
            }
          : event.data,
      },
    );

    toast.add({
      title: isEdit.value ? "Member updated" : "Member saved",
      description: isEdit.value
        ? `${event.data.email} has been updated.`
        : `${event.data.email} is now an approved user.`,
      color: "success",
    });

    open.value = false;
    syncState();

    if (isEdit.value) {
      emit("updated");
      return;
    }

    emit("created");
  } catch (error) {
    toast.add({
      title: isEdit.value ? "Unable to update member" : "Unable to save member",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  } finally {
    loading.value = false;
  }
}
</script>

<template>
  <UModal
    v-model:open="open"
    :title="modalTitle"
    :description="modalDescription"
    :ui="{ content: 'sm:max-w-2xl' }"
  >
    <UButton v-if="showTrigger" label="Add member" icon="i-lucide-user-plus" />

    <template #body>
      <UForm
        :schema="schema"
        :state="state"
        class="space-y-4"
        @submit="onSubmit"
      >
        <UFormField label="Name" name="name">
          <UInput v-model="state.name" class="w-full" />
        </UFormField>

        <UFormField label="Email" name="email">
          <UInput v-model="state.email" type="email" class="w-full" />
        </UFormField>

        <UFormField
          v-if="!isEdit"
          label="Initial password"
          name="password"
          description="Optional. Leave blank for Google-only access for now."
        >
          <UInput
            v-model="state.password"
            type="password"
            autocomplete="new-password"
            class="w-full"
          />
        </UFormField>

        <UFormField
          label="Roles"
          name="roles"
          description="Users can hold multiple roles at once."
        >
          <div class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="role in roleOptions"
              :key="role.slug"
              class="flex items-center gap-2 rounded-lg border border-default px-3 py-2 text-sm"
            >
              <UCheckbox
                :model-value="state.roles.includes(role.slug)"
                @update:model-value="
                  (checked: boolean | 'indeterminate') => {
                    if (checked) {
                      state.roles = Array.from(
                        new Set([...state.roles, role.slug]),
                      );
                      return;
                    }

                    state.roles = state.roles.filter(
                      (value) => value !== role.slug,
                    );
                  }
                "
              />
              <span>{{ role.name }}</span>
            </label>
          </div>
        </UFormField>

        <div
          v-if="isEdit && member && (canManagePassword || canManageStatus)"
          class="space-y-3 rounded-xl border border-default/70 bg-elevated/30 p-4"
        >
          <div class="space-y-1">
            <p class="text-sm font-medium text-highlighted">Account access</p>
            <p class="text-xs text-muted">
              Keep existing password and activation tools available while
              editing the member.
            </p>
          </div>

          <div class="flex flex-wrap gap-2">
            <UButton
              v-if="canManagePassword"
              color="neutral"
              variant="outline"
              :label="member.hasPassword ? 'Reset password' : 'Set password'"
              icon="i-lucide-key-round"
              @click="emit('password', member)"
            />
            <UButton
              v-if="canManageStatus"
              color="neutral"
              variant="outline"
              :label="member.isBanned ? 'Activate member' : 'Deactivate member'"
              :icon="
                member.isBanned
                  ? 'i-lucide-badge-check'
                  : 'i-lucide-user-round-x'
              "
              @click="emit('status', member)"
            />
          </div>
        </div>

        <div class="flex justify-end gap-2 border-t border-default pt-4">
          <UButton
            label="Cancel"
            color="neutral"
            variant="subtle"
            @click="open = false"
          />
          <UButton :label="submitLabel" type="submit" :loading="loading" />
        </div>
      </UForm>
    </template>
  </UModal>
</template>
