-- Better Auth 1.7 identifies accounts by (issuer, accountId). This project
-- previously configured only credential and Google providers. Stop before any
-- schema change if an unexpected legacy provider requires a reviewed mapping.
CREATE TEMPORARY TABLE `_better_auth_account_issuer_guard` (
    `value` TINYINT NOT NULL
);

INSERT INTO `_better_auth_account_issuer_guard` (`value`)
SELECT IF(
    EXISTS(
        SELECT 1
        FROM `account`
        WHERE `providerId` NOT IN ('credential', 'google')
    ),
    NULL,
    1
);

DROP TEMPORARY TABLE `_better_auth_account_issuer_guard`;

-- Backfill deterministic provider-id namespaces before issuer becomes required.
ALTER TABLE `account` ADD COLUMN `issuer` VARCHAR(191) NULL;

UPDATE `account`
SET `issuer` = CASE `providerId`
    WHEN 'credential' THEN 'local:credential'
    WHEN 'google' THEN 'local:oauth:google'
END
WHERE `issuer` IS NULL;

ALTER TABLE `account` MODIFY `issuer` VARCHAR(191) NOT NULL;

CREATE UNIQUE INDEX `account_issuer_accountId_key` ON `account`(`issuer`, `accountId`);

DROP INDEX `account_providerId_accountId_key` ON `account`;
