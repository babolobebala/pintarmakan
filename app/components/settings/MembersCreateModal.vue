<script setup lang="ts">
import * as z from "zod";
import type { FormSubmitEvent } from "@nuxt/ui";
import type { BidangOption, Member, RoleOption } from "~/types";

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
const { data: bidangs } = await useFetch<BidangOption[]>("/api/bidang/options", {
  default: () => [],
});

const roleOptions = computed(() => roles.value);
const roleSlugs = computed(() => roleOptions.value.map((role) => role.slug));
const bidangOptions = computed(() => {
  return bidangs.value.map((bidang) => ({
    id: bidang.id,
    name: bidang.name,
    description: bidang.description ?? undefined,
  }));
});
const bidangIds = computed(() => bidangOptions.value.map((bidang) => bidang.id));

const schema = z.object({
  name: z.string().min(2, "Too short"),
  email: z.email("Invalid email"),
  password: z.union([
    z.literal(""),
    z.string().min(8, "Password must be at least 8 characters"),
  ]),
  role: z.string().min(1, "Select a role").superRefine((value, ctx) => {
    if (!roleSlugs.value.includes(value)) {
      ctx.addIssue({
        code: "custom",
        message: "Select a valid role.",
      });
    }
  }),
  bidangIds: z.array(z.string()).superRefine((value, ctx) => {
    const availableBidangs = new Set(bidangIds.value);

    for (const bidangId of value) {
      if (!availableBidangs.has(bidangId)) {
        ctx.addIssue({
          code: "custom",
          message: "Select a valid Bidang.",
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
  role: "user",
  bidangIds: [],
});

const loading = ref(false);
const bidangLoading = ref(false);
const isEdit = computed(() => !!props.member);
const modalTitle = computed(() =>
  isEdit.value ? "Edit member" : "Add member",
);
const modalDescription = computed(() => {
  return isEdit.value
    ? "Update the member profile, system role, and operator Bidang assignments."
    : "Create an internal user record and assign one system role.";
});
const submitLabel = computed(() =>
  isEdit.value ? "Save changes" : "Add member",
);
const defaultRole = computed(() => {
  if (roleSlugs.value.length === 0) {
    return "";
  }

  return roleSlugs.value.includes("user")
    ? "user"
    : (roleSlugs.value[0] ?? "");
});
const selectedRole = computed(() => {
  return roleOptions.value.find((role) => role.slug === state.role) ?? null;
});
const shouldShowBidangAssignments = computed(() => state.role === "operator");
const hasBidangOptions = computed(() => bidangOptions.value.length > 0);

function syncState() {
  if (props.member) {
    state.name = props.member.name;
    state.email = props.member.email;
    state.password = "";
    state.role = props.member.roles.find((role) => roleSlugs.value.includes(role))
      ?? defaultRole.value;
    state.bidangIds = [];

    return;
  }

  state.name = "";
  state.email = "";
  state.password = "";
  state.role = defaultRole.value;
  state.bidangIds = [];
}

async function loadMemberBidangAssignments() {
  if (!props.member || state.role !== "operator") {
    state.bidangIds = [];
    return;
  }

  bidangLoading.value = true;

  try {
    const response = await $fetch<{ bidangIds: string[] }>(
      `/api/members/${props.member.id}/bidang`,
    );

    state.bidangIds = response.bidangIds.filter((bidangId) =>
      bidangIds.value.includes(bidangId),
    );
  } catch (error) {
    state.bidangIds = [];
    toast.add({
      title: "Unable to load Bidang assignments",
      description: error instanceof Error ? error.message : "Please try again.",
      color: "error",
    });
  } finally {
    bidangLoading.value = false;
  }
}

watch(
  roleSlugs,
  (value) => {
    if (value.length === 0) {
      state.role = "";
      return;
    }

    if (!value.includes(state.role)) {
      state.role = value.includes("user") ? "user" : (value[0] ?? "");
    }
  },
  { immediate: true },
);

watch(
  bidangIds,
  (value) => {
    state.bidangIds = state.bidangIds.filter((bidangId) => value.includes(bidangId));
  },
  { immediate: true },
);

watch(
  [open, () => props.member],
  async ([isOpen]) => {
    if (isOpen) {
      syncState();

      if (state.role === "operator") {
        await loadMemberBidangAssignments();
      }
    }
  },
  { immediate: true },
);

watch(
  () => state.role,
  async (value, previousValue) => {
    if (!open.value) {
      return;
    }

    if (value !== "operator") {
      state.bidangIds = [];
      return;
    }

    if (props.member && previousValue !== "operator") {
      await loadMemberBidangAssignments();
    }
  },
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
              role: event.data.role,
              bidangIds: event.data.role === "operator" ? event.data.bidangIds : undefined,
            }
          : {
              ...event.data,
              bidangIds: event.data.role === "operator" ? event.data.bidangIds : [],
            },
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
          label="System role"
          name="role"
          description="Pilih satu peran sistem tertinggi untuk akun ini."
        >
          <div class="space-y-3">
            <USelectMenu
              v-model="state.role"
              :items="roleOptions"
              value-key="slug"
              label-key="name"
              placeholder="Select role"
              class="w-full"
            />

            <p v-if="selectedRole" class="text-xs text-muted">
              {{ selectedRole.description }}
            </p>
          </div>
        </UFormField>

        <UFormField
          v-if="shouldShowBidangAssignments"
          label="Assigned Bidang"
          name="bidangIds"
          description="Operator hanya dapat mengubah data pada Bidang yang dipilih."
        >
          <div class="space-y-3">
            <USelectMenu
              v-model="state.bidangIds"
              :items="bidangOptions"
              value-key="id"
              label-key="name"
              multiple
              placeholder="Select Bidang"
              class="w-full"
              :loading="bidangLoading"
              :search-input="{ placeholder: 'Cari Bidang...' }"
            />

            <UAlert
              v-if="!hasBidangOptions"
              icon="i-lucide-info"
              title="Belum ada master Bidang"
              description="Belum ada record Bidang di database, jadi operator belum bisa diberi scope."
              color="neutral"
              variant="subtle"
            />
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
