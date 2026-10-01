-- AlterTable
ALTER TABLE `SavingsGoal` ADD COLUMN `ongoing` BOOLEAN NOT NULL DEFAULT false;


-- Quỹ khẩn cấp có sẵn: chuyển thành quỹ duy trì
UPDATE `SavingsGoal` SET `ongoing` = true WHERE `jar` = 'SAFETY';
