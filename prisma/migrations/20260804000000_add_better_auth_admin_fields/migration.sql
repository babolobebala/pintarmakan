ALTER TABLE `user`
  ADD COLUMN `role` VARCHAR(191) NULL AFTER `name`;

UPDATE `user`
SET `role` = 'user'
WHERE `role` IS NULL;

ALTER TABLE `session`
  ADD COLUMN `impersonatedBy` VARCHAR(191) NULL AFTER `userAgent`;
