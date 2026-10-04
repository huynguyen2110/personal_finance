-- Thời hạn mục tiêu: từ tháng "YYYY-MM" sang ngày "YYYY-MM-DD"
ALTER TABLE "SavingsGoal" ALTER COLUMN "deadline" SET DATA TYPE VARCHAR(10);

-- Hạn cũ theo tháng → ngày cuối tháng đó (vẫn thuộc đúng tháng tài chính cũ với mọi ngày bắt đầu tháng)
UPDATE "SavingsGoal"
SET "deadline" = to_char((to_date("deadline" || '-01', 'YYYY-MM-DD') + INTERVAL '1 month - 1 day'), 'YYYY-MM-DD')
WHERE "deadline" ~ '^\d{4}-\d{2}$';
