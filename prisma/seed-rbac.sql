-- Manual RBAC seed for the current project schema.
-- Safe to run multiple times on MySQL because it uses
-- ON DUPLICATE KEY UPDATE / INSERT IGNORE.

START TRANSACTION;

-- Permissions
INSERT INTO `permissions` (`id`, `key`, `label`, `description`, `group`, `isSystem`, `createdAt`, `updatedAt`) VALUES
  ('perm_dashboard_read', 'dashboard.read', 'Read Dashboard', 'Open the main dashboard.', 'Dashboard', TRUE, NOW(), NOW()),
  ('perm_settings_read', 'settings.read', 'Read Settings', 'Access the settings area.', 'Settings', TRUE, NOW(), NOW()),
  ('perm_users_read', 'users.read', 'Read Users', 'Read approved user records.', 'Users', TRUE, NOW(), NOW()),
  ('perm_users_create', 'users.create', 'Create Users', 'Approve and create internal users.', 'Users', TRUE, NOW(), NOW()),
  ('perm_users_update', 'users.update', 'Update Users', 'Change existing user records, role assignments, and passwords.', 'Users', TRUE, NOW(), NOW()),
  ('perm_users_delete', 'users.delete', 'Delete Users', 'Remove or deactivate internal accounts.', 'Users', TRUE, NOW(), NOW()),
  ('perm_roles_read', 'roles.read', 'Read Roles', 'Browse available roles.', 'Roles', TRUE, NOW(), NOW()),
  ('perm_roles_create', 'roles.create', 'Create Roles', 'Create custom roles.', 'Roles', TRUE, NOW(), NOW()),
  ('perm_roles_update', 'roles.update', 'Update Roles', 'Edit custom roles and their permission sets.', 'Roles', TRUE, NOW(), NOW()),
  ('perm_roles_delete', 'roles.delete', 'Delete Roles', 'Delete custom roles.', 'Roles', TRUE, NOW(), NOW()),
  ('perm_permissions_read', 'permissions.read', 'Read Permissions', 'Inspect permission definitions.', 'Permissions', TRUE, NOW(), NOW()),
  ('perm_permissions_create', 'permissions.create', 'Create Permissions', 'Create permission definitions.', 'Permissions', TRUE, NOW(), NOW()),
  ('perm_permissions_update', 'permissions.update', 'Update Permissions', 'Edit permission definitions.', 'Permissions', TRUE, NOW(), NOW()),
  ('perm_permissions_delete', 'permissions.delete', 'Delete Permissions', 'Delete permission definitions.', 'Permissions', TRUE, NOW(), NOW()),
  ('perm_audit_logs_read', 'audit-logs.read', 'Read Audit Logs', 'Review audit log history.', 'Audit Logs', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `label` = VALUES(`label`),
  `description` = VALUES(`description`),
  `group` = VALUES(`group`),
  `isSystem` = VALUES(`isSystem`),
  `updatedAt` = NOW();

-- Roles
INSERT INTO `roles` (`id`, `slug`, `name`, `description`, `isSystem`, `createdAt`, `updatedAt`) VALUES
  ('role_super_admin', 'super-admin', 'Super Admin', 'Full access to the dashboard, member administration, role management, and audit data.', TRUE, NOW(), NOW()),
  ('role_admin', 'admin', 'Admin', 'Manage members and operational settings without full role administration.', TRUE, NOW(), NOW()),
  ('role_user', 'user', 'User', 'Basic dashboard access for day-to-day work.', TRUE, NOW(), NOW())
ON DUPLICATE KEY UPDATE
  `name` = VALUES(`name`),
  `description` = VALUES(`description`),
  `isSystem` = VALUES(`isSystem`),
  `updatedAt` = NOW();

-- Reset system role permission mappings
DELETE FROM `role_permissions`
WHERE `roleId` IN ('role_super_admin', 'role_admin', 'role_user');

-- Super Admin: all built-in permissions
INSERT IGNORE INTO `role_permissions` (`roleId`, `permissionId`, `assignedAt`) VALUES
  ('role_super_admin', 'perm_dashboard_read', NOW()),
  ('role_super_admin', 'perm_settings_read', NOW()),
  ('role_super_admin', 'perm_users_read', NOW()),
  ('role_super_admin', 'perm_users_create', NOW()),
  ('role_super_admin', 'perm_users_update', NOW()),
  ('role_super_admin', 'perm_users_delete', NOW()),
  ('role_super_admin', 'perm_roles_read', NOW()),
  ('role_super_admin', 'perm_roles_create', NOW()),
  ('role_super_admin', 'perm_roles_update', NOW()),
  ('role_super_admin', 'perm_roles_delete', NOW()),
  ('role_super_admin', 'perm_permissions_read', NOW()),
  ('role_super_admin', 'perm_permissions_create', NOW()),
  ('role_super_admin', 'perm_permissions_update', NOW()),
  ('role_super_admin', 'perm_permissions_delete', NOW()),
  ('role_super_admin', 'perm_audit_logs_read', NOW());

-- Admin
INSERT IGNORE INTO `role_permissions` (`roleId`, `permissionId`, `assignedAt`) VALUES
  ('role_admin', 'perm_dashboard_read', NOW()),
  ('role_admin', 'perm_settings_read', NOW()),
  ('role_admin', 'perm_users_read', NOW()),
  ('role_admin', 'perm_users_create', NOW()),
  ('role_admin', 'perm_users_update', NOW()),
  ('role_admin', 'perm_users_delete', NOW()),
  ('role_admin', 'perm_roles_read', NOW()),
  ('role_admin', 'perm_audit_logs_read', NOW());

-- User
INSERT IGNORE INTO `role_permissions` (`roleId`, `permissionId`, `assignedAt`) VALUES
  ('role_user', 'perm_dashboard_read', NOW());

COMMIT;

-- Optional user-role assignment example:
-- 1. Create the user first through Better Auth or your app flow.
-- 2. Then assign the system role manually:
--
-- INSERT IGNORE INTO `user_roles` (`userId`, `roleId`, `assignedAt`)
-- VALUES ('your-user-id', 'role_super_admin', NOW());
