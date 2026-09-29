-- AlterTable
ALTER TABLE `Account` ADD COLUMN `bankBalance` BIGINT NULL,
    ADD COLUMN `bankBalanceAt` DATETIME(3) NULL;

