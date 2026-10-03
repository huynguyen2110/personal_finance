-- CreateTable
CREATE TABLE "GroupBudget" (
    "id" SERIAL NOT NULL,
    "groupId" INTEGER NOT NULL,
    "month" VARCHAR(7) NOT NULL,
    "amount" BIGINT NOT NULL,

    CONSTRAINT "GroupBudget_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GroupBudget_groupId_month_key" ON "GroupBudget"("groupId", "month");

-- AddForeignKey
ALTER TABLE "GroupBudget" ADD CONSTRAINT "GroupBudget_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "CategoryGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
