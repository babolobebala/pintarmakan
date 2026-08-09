import { createError, getRouterParam, readBody } from "h3";
import { z } from "zod";

import {
  appPermissions,
  getEffectiveRoles,
  getUnknownRoles,
  normalizeRoleSelection,
} from "~~/auth/permissions";
import { requirePermission } from "~~/server/utils/access";
import { updateManagedUser } from "#server/utils/auth-admin";
import { db } from "#server/utils/db";

const updateMemberSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.email().trim().max(191),
  roles: z.array(z.string().trim().min(1)).min(1),
});

export default defineEventHandler(async (event) => {
  const session = await requirePermission(event, appPermissions.membersUpdate);
  const userId = getRouterParam(event, "id");

  if (!userId) {
    throw createError({
      statusCode: 400,
      statusMessage: "Missing member id.",
    });
  }

  const body = updateMemberSchema.parse(await readBody(event));
  const unknownRoles = getUnknownRoles(body.roles);

  if (unknownRoles.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown role: ${unknownRoles.join(", ")}`,
    });
  }

  const roles = normalizeRoleSelection(body.roles);
  const { user, roles: assignedRoles } = await updateManagedUser(
    event,
    userId,
    {
      email: body.email,
      name: body.name,
      roles,
    },
  );

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "members.update",
      entityType: "user",
      entityId: userId,
      metadata: {
        email: user.email,
        roles: assignedRoles,
      },
    },
  });

  return {
    id: user.id,
    roles: getEffectiveRoles(assignedRoles.join(",")),
  };
});
