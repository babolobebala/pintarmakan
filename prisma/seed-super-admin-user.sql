-- Manual seed for one initial super admin user.
-- Change the email, name, and id values below before running if needed.
-- This file assumes the super-admin role already exists.
-- Run prisma/seed-rbac.sql first if roles/permissions are not seeded yet.
START TRANSACTION;

INSERT INTO
  `user` (
    `id`,
    `name`,
    `email`,
    `emailVerified`,
    `image`,
    `banned`,
    `banReason`,
    `banExpires`,
    `isActive`,
    `createdAt`,
    `updatedAt`
  )
VALUES
  (
    'user_super_admin',
    'Super Admin',
    'fatihmahawisesa@gmail.com',
    TRUE,
    NULL,
    FALSE,
    NULL,
    NULL,
    TRUE,
    NOW(),
    NOW()
  ) ON DUPLICATE KEY
UPDATE
  `name` =
VALUES
(`name`),
  `emailVerified` =
VALUES
(`emailVerified`),
  `isActive` =
VALUES
(`isActive`),
  `updatedAt` = NOW();

INSERT INTO
  `user_roles` (`userId`, `roleId`, `assignedAt`)
SELECT
  `user`.`id`,
  `roles`.`id`,
  NOW()
FROM
  `user`
  JOIN `roles` ON `roles`.`slug` = 'super-admin'
WHERE
  `user`.`email` = 'fatihmahawisesa@gmail.com' ON DUPLICATE KEY
UPDATE
  `assignedAt` =
VALUES
(`assignedAt`);

COMMIT;

-- Notes:
-- 1. This creates only the user row and super-admin role assignment.
-- 2. It does not create a credential password account.
-- 3. If you need email/password login too, create the user through the app
--    or generate a proper Better Auth password hash separately.
