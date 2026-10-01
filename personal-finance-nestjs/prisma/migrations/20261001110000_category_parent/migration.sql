-- AlterTable: danh mục 2 cấp (danh mục con trỏ về danh mục cha)
ALTER TABLE `Category` ADD COLUMN `parentId` INTEGER NULL;

-- CreateIndex
CREATE INDEX `Category_parentId_idx` ON `Category`(`parentId`);

-- AddForeignKey
ALTER TABLE `Category` ADD CONSTRAINT `Category_parentId_fkey` FOREIGN KEY (`parentId`) REFERENCES `Category`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
