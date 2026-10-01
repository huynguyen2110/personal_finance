-- CreateTable
CREATE TABLE `SavingsGoal` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT 'PiggyBank',
    `jar` ENUM('SAFETY', 'PURCHASE', 'EXPERIENCE', 'INVESTMENT', 'SELF', 'OTHER') NOT NULL DEFAULT 'OTHER',
    `priority` ENUM('HIGH', 'NORMAL', 'FLEXIBLE') NOT NULL DEFAULT 'NORMAL',
    `targetAmount` BIGINT NOT NULL,
    `deadline` VARCHAR(7) NULL,
    `monthlyPlan` BIGINT NULL,
    `planDay` INTEGER NULL,
    `sourceAccountId` INTEGER NULL,
    `holdingAccountId` INTEGER NULL,
    `holdingName` VARCHAR(191) NULL,
    `interestRateBp` INTEGER NULL,
    `note` TEXT NULL,
    `completedAt` DATETIME(3) NULL,
    `archivedAt` DATETIME(3) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `GoalContribution` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `goalId` INTEGER NOT NULL,
    `kind` ENUM('OPENING', 'DEPOSIT', 'WITHDRAW', 'INTEREST') NOT NULL,
    `amount` BIGINT NOT NULL,
    `date` DATETIME(3) NOT NULL,
    `note` TEXT NULL,
    `transactionId` INTEGER NULL,
    `excludedTxn` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `GoalContribution_transactionId_key`(`transactionId`),
    INDEX `GoalContribution_goalId_date_idx`(`goalId`, `date`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `SavingsGoal` ADD CONSTRAINT `SavingsGoal_sourceAccountId_fkey` FOREIGN KEY (`sourceAccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `SavingsGoal` ADD CONSTRAINT `SavingsGoal_holdingAccountId_fkey` FOREIGN KEY (`holdingAccountId`) REFERENCES `Account`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalContribution` ADD CONSTRAINT `GoalContribution_goalId_fkey` FOREIGN KEY (`goalId`) REFERENCES `SavingsGoal`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `GoalContribution` ADD CONSTRAINT `GoalContribution_transactionId_fkey` FOREIGN KEY (`transactionId`) REFERENCES `Transaction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

