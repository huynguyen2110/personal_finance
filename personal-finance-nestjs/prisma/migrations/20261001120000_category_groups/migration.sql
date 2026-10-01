-- Nhóm chi tiêu / thu nhập (tầng trên danh mục cha), gán nhóm cho tài khoản,
-- quy tắc giới hạn theo tài khoản, và trạng thái phân loại "ACCOUNT" (tự gán theo nhóm của tài khoản)

-- AlterTable: thêm giá trị enum ACCOUNT
ALTER TABLE `Transaction` MODIFY `categorizedBy` ENUM('RULE', 'MANUAL', 'NONE', 'ACCOUNT') NOT NULL DEFAULT 'NONE';

-- CreateTable
CREATE TABLE `CategoryGroup` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(191) NOT NULL,
    `kind` ENUM('EXPENSE', 'INCOME') NOT NULL,
    `icon` VARCHAR(191) NOT NULL DEFAULT 'Layers',
    `color` VARCHAR(191) NOT NULL DEFAULT '#64748B',
    `sortOrder` INTEGER NOT NULL DEFAULT 0,
    `defaultCategoryId` INTEGER NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    UNIQUE INDEX `CategoryGroup_name_kind_key`(`name`, `kind`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `AccountCategoryGroup` (
    `accountId` INTEGER NOT NULL,
    `groupId` INTEGER NOT NULL,

    INDEX `AccountCategoryGroup_groupId_idx`(`groupId`),
    PRIMARY KEY (`accountId`, `groupId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AlterTable: danh mục cha thuộc nhóm
ALTER TABLE `Category` ADD COLUMN `groupId` INTEGER NULL;
CREATE INDEX `Category_groupId_idx` ON `Category`(`groupId`);

-- AlterTable: quy tắc giới hạn theo tài khoản
ALTER TABLE `CategoryRule` ADD COLUMN `accountId` INTEGER NULL;
CREATE INDEX `CategoryRule_accountId_idx` ON `CategoryRule`(`accountId`);

-- AddForeignKey
ALTER TABLE `CategoryGroup` ADD CONSTRAINT `CategoryGroup_defaultCategoryId_fkey` FOREIGN KEY (`defaultCategoryId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `AccountCategoryGroup` ADD CONSTRAINT `AccountCategoryGroup_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `AccountCategoryGroup` ADD CONSTRAINT `AccountCategoryGroup_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CategoryGroup`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE `Category` ADD CONSTRAINT `Category_groupId_fkey` FOREIGN KEY (`groupId`) REFERENCES `CategoryGroup`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE `CategoryRule` ADD CONSTRAINT `CategoryRule_accountId_fkey` FOREIGN KEY (`accountId`) REFERENCES `Account`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
