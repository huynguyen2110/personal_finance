-- CreateEnum
CREATE TYPE "NodeLinkKind" AS ENUM ('supports', 'prerequisite', 'related');

-- AlterTable
ALTER TABLE "mm_nodes" ADD COLUMN     "status" VARCHAR(10);

-- AlterTable
ALTER TABLE "mm_property_definitions" ADD COLUMN     "role" VARCHAR(20),
ADD COLUMN     "unit" VARCHAR(20);

-- AlterTable
ALTER TABLE "mm_todos" ADD COLUMN     "durationMinutes" INTEGER,
ADD COLUMN     "effectiveness" INTEGER;

-- CreateTable
CREATE TABLE "mm_node_links" (
    "id" SERIAL NOT NULL,
    "mindmapId" INTEGER NOT NULL,
    "sourceNodeId" INTEGER NOT NULL,
    "targetNodeId" INTEGER NOT NULL,
    "kind" "NodeLinkKind" NOT NULL,
    "note" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mm_node_links_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "mm_node_links_mindmapId_idx" ON "mm_node_links"("mindmapId");

-- CreateIndex
CREATE INDEX "mm_node_links_targetNodeId_idx" ON "mm_node_links"("targetNodeId");

-- CreateIndex
CREATE UNIQUE INDEX "mm_node_links_sourceNodeId_targetNodeId_kind_key" ON "mm_node_links"("sourceNodeId", "targetNodeId", "kind");

-- AddForeignKey
ALTER TABLE "mm_node_links" ADD CONSTRAINT "mm_node_links_mindmapId_fkey" FOREIGN KEY ("mindmapId") REFERENCES "mm_mindmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_node_links" ADD CONSTRAINT "mm_node_links_sourceNodeId_fkey" FOREIGN KEY ("sourceNodeId") REFERENCES "mm_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_node_links" ADD CONSTRAINT "mm_node_links_targetNodeId_fkey" FOREIGN KEY ("targetNodeId") REFERENCES "mm_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
