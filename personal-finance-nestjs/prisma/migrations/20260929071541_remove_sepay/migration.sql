-- Bỏ tích hợp SePay: giao dịch cũ từ webhook/đồng bộ chuyển sang nguồn IMPORT
ALTER TABLE `Transaction` MODIFY `source` ENUM('WEBHOOK', 'SYNC', 'MANUAL', 'EMAIL', 'IMPORT') NOT NULL;
UPDATE `Transaction` SET `source` = 'IMPORT' WHERE `source` IN ('WEBHOOK', 'SYNC');
ALTER TABLE `Transaction` MODIFY `source` ENUM('EMAIL', 'MANUAL', 'IMPORT') NOT NULL;

-- DropIndex
DROP INDEX `Transaction_sepayId_key` ON `Transaction`;

-- AlterTable
ALTER TABLE `Transaction` DROP COLUMN `sepayId`,
    DROP COLUMN `balanceAfter`;

-- AlterTable
ALTER TABLE `Account` DROP COLUMN `currentBalance`,
    DROP COLUMN `lastSepayId`,
    DROP COLUMN `lastSyncedAt`;

-- DropTable
DROP TABLE `WebhookLog`;
