-- AlterTable
ALTER TABLE `Transaction` ADD COLUMN `transferIgnored` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `transferPairId` INTEGER NULL;

-- CreateIndex
CREATE UNIQUE INDEX `Transaction_transferPairId_key` ON `Transaction`(`transferPairId`);

-- CreateIndex
CREATE INDEX `Transaction_amount_transactionDate_idx` ON `Transaction`(`amount`, `transactionDate`);

-- AddForeignKey
ALTER TABLE `Transaction` ADD CONSTRAINT `Transaction_transferPairId_fkey` FOREIGN KEY (`transferPairId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

