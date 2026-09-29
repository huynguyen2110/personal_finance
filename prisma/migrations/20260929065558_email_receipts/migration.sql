-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `externalId` VARCHAR(100) NULL,
    MODIFY `source` ENUM('WEBHOOK', 'SYNC', 'MANUAL', 'EMAIL') NOT NULL;

-- CreateTable
CREATE TABLE `AppState` (
    `key` VARCHAR(100) NOT NULL,
    `value` TEXT NOT NULL,
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`key`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Transaction_externalId_key` ON `Transaction`(`externalId`);

