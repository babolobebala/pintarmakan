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
import { replaceUserBidangAssignments } from "#server/utils/bidang";
import { db } from "#server/utils/db";

const updateMemberSchema = z.object({
  name: z.string().trim().min(2).max(191),
  email: z.email().trim().max(191),
  role: z.string().trim().min(1),
  bidangIds: z.array(z.string().trim().min(1)).optional(),
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
  const unknownRoles = getUnknownRoles(body.role);

  if (unknownRoles.length > 0) {
    throw createError({
      statusCode: 400,
      statusMessage: `Unknown role: ${unknownRoles.join(", ")}`,
    });
  }

  const role = normalizeRoleSelection(body.role);
  const { user, role: assignedRole } = await updateManagedUser(
    event,
    userId,
    {
      email: body.email,
      name: body.name,
      role,
    },
  );
  const bidangAssignment = assignedRole === "operator" && body.bidangIds
    ? await replaceUserBidangAssignments(userId, body.bidangIds)
    : null;

  await db.auditLog.create({
    data: {
      actorId: session.user.id,
      action: "members.update",
      entityType: "user",
      entityId: userId,
      metadata: {
        email: user.email,
        role: assignedRole,
        bidangIds: bidangAssignment?.bidangIds,
        addedBidangIds: bidangAssignment?.addedBidangIds,
        removedBidangIds: bidangAssignment?.removedBidangIds,
      },
    },
  });

  if (bidangAssignment && (bidangAssignment.addedBidangIds.length > 0 || bidangAssignment.removedBidangIds.length > 0)) {
    await db.auditLog.create({
      data: {
        actorId: session.user.id,
        action: "member.bidang.updated",
        entityType: "user",
        entityId: userId,
        metadata: {
          role: assignedRole,
          bidangIds: bidangAssignment.bidangIds,
          addedBidangIds: bidangAssignment.addedBidangIds,
          removedBidangIds: bidangAssignment.removedBidangIds,
        },
      },
    });
  }

  return {
    id: user.id,
    roles: getEffectiveRoles(assignedRole),
  };
});
