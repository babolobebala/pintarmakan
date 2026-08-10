-- CreateTable
CREATE TABLE `regions` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `level` VARCHAR(191) NOT NULL,
    `parentId` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `regions_parentId_idx`(`parentId`),
    INDEX `regions_level_idx`(`level`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `datasets` (
    `id` VARCHAR(191) NOT NULL,
    `name` VARCHAR(191) NOT NULL,
    `description` TEXT NULL,
    `dataSchema` JSON NOT NULL,
    `dataConfig` JSON NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `auth_bidang_dataset_permissions` (
    `id` VARCHAR(191) NOT NULL,
    `bidangId` VARCHAR(191) NOT NULL,
    `datasetId` VARCHAR(191) NOT NULL,
    `canRead` BOOLEAN NOT NULL DEFAULT false,
    `canCreate` BOOLEAN NOT NULL DEFAULT false,
    `canUpdate` BOOLEAN NOT NULL DEFAULT false,
    `canDelete` BOOLEAN NOT NULL DEFAULT false,
    `canImport` BOOLEAN NOT NULL DEFAULT false,
    `canExport` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `auth_bidang_dataset_permissions_bidangId_idx`(`bidangId`),
    INDEX `auth_bidang_dataset_permissions_datasetId_idx`(`datasetId`),
    UNIQUE INDEX `auth_bidang_dataset_permissions_bidangId_datasetId_key`(`bidangId`, `datasetId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `notifications` (
    `id` VARCHAR(191) NOT NULL,
    `userId` VARCHAR(191) NOT NULL,
    `type` VARCHAR(191) NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `message` TEXT NOT NULL,
    `metadata` JSON NULL,
    `readAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `notifications_userId_idx`(`userId`),
    INDEX `notifications_userId_readAt_idx`(`userId`, `readAt`),
    INDEX `notifications_createdAt_idx`(`createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `dataset_records` (
    `id` VARCHAR(191) NOT NULL,
    `datasetId` VARCHAR(191) NOT NULL,
    `regionId` VARCHAR(191) NOT NULL,
    `ownerBidangId` VARCHAR(191) NOT NULL,
    `periodDate` DATE NOT NULL,
    `data` JSON NOT NULL,
    `status` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `dataset_records_datasetId_idx`(`datasetId`),
    INDEX `dataset_records_regionId_idx`(`regionId`),
    INDEX `dataset_records_ownerBidangId_idx`(`ownerBidangId`),
    INDEX `dataset_records_periodDate_idx`(`periodDate`),
    INDEX `dataset_records_datasetId_periodDate_idx`(`datasetId`, `periodDate`),
    UNIQUE INDEX `dataset_records_datasetId_regionId_periodDate_key`(`datasetId`, `regionId`, `periodDate`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `regions` ADD CONSTRAINT `regions_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `regions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_bidang_dataset_permissions` ADD CONSTRAINT `auth_bidang_dataset_permissions_bidangId_fkey` FOREIGN KEY (`bidangId`) REFERENCES `auth_bidang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `auth_bidang_dataset_permissions` ADD CONSTRAINT `auth_bidang_dataset_permissions_datasetId_fkey` FOREIGN KEY (`datasetId`) REFERENCES `datasets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_userId_fkey` FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_records` ADD CONSTRAINT `dataset_records_datasetId_fkey` FOREIGN KEY (`datasetId`) REFERENCES `datasets`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_records` ADD CONSTRAINT `dataset_records_regionId_fkey` FOREIGN KEY (`regionId`) REFERENCES `regions`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_records` ADD CONSTRAINT `dataset_records_ownerBidangId_fkey` FOREIGN KEY (`ownerBidangId`) REFERENCES `auth_bidang`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `dataset_records` ADD CONSTRAINT `dataset_records_createdBy_fkey` FOREIGN KEY (`createdBy`) REFERENCES `user`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
