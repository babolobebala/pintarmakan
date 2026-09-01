-- AlterTable
ALTER TABLE `dataset_records` ADD COLUMN `updatedBy` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `dataset_record_history` (
    `id` VARCHAR(191) NOT NULL,
    `sourceRecordId` VARCHAR(191) NOT NULL,
    `datasetId` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `periodDate` DATE NOT NULL,
    `data` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,
    `changeType` VARCHAR(191) NOT NULL,
    `changedBy` VARCHAR(191) NULL,
    `changedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `dataset_record_history_sourceRecordId_idx`(`sourceRecordId`),
    INDEX `dataset_record_history_datasetId_idx`(`datasetId`),
    INDEX `dataset_record_history_regionId_idx`(`regionId`),
    INDEX `dataset_record_history_changedAt_idx`(`changedAt`),
    INDEX `dataset_record_history_datasetId_regionId_periodDate_idx`(`datasetId`, `regionId`, `periodDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `dataset_records` ADD CONSTRAINT `dataset_records_updatedBy_fkey` FOREIGN KEY (`updatedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_record_history` ADD CONSTRAINT `dataset_record_history_datasetId_fkey` FOREIGN KEY (`datasetId`) REFERENCES `datasets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_record_history` ADD CONSTRAINT `dataset_record_history_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_record_history` ADD CONSTRAINT `dataset_record_history_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_record_history` ADD CONSTRAINT `dataset_record_history_changedBy_fkey` FOREIGN KEY (`changedBy`) REFERENCES `user`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
