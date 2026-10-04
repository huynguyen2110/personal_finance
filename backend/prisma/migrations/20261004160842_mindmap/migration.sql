-- CreateEnum
CREATE TYPE "PropertyType" AS ENUM ('text', 'number', 'boolean', 'date', 'select');

-- CreateTable
CREATE TABLE "mm_mindmaps" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mm_mindmaps_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mm_nodes" (
    "id" SERIAL NOT NULL,
    "mindmapId" INTEGER NOT NULL,
    "parentId" INTEGER,
    "title" VARCHAR(500) NOT NULL,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "collapsed" BOOLEAN NOT NULL DEFAULT false,
    "color" VARCHAR(20),
    "pageContent" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mm_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mm_property_definitions" (
    "id" SERIAL NOT NULL,
    "mindmapId" INTEGER NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "PropertyType" NOT NULL,
    "options" JSONB,
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mm_property_definitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mm_node_property_values" (
    "id" SERIAL NOT NULL,
    "nodeId" INTEGER NOT NULL,
    "propertyDefinitionId" INTEGER NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "mm_node_property_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mm_todos" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "date" VARCHAR(10) NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TIMESTAMP(3),
    "orderIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "mm_todos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mm_todo_nodes" (
    "todoId" INTEGER NOT NULL,
    "nodeId" INTEGER NOT NULL,

    CONSTRAINT "mm_todo_nodes_pkey" PRIMARY KEY ("todoId","nodeId")
);

-- CreateIndex
CREATE INDEX "mm_mindmaps_userId_idx" ON "mm_mindmaps"("userId");

-- CreateIndex
CREATE INDEX "mm_nodes_mindmapId_parentId_idx" ON "mm_nodes"("mindmapId", "parentId");

-- CreateIndex
CREATE UNIQUE INDEX "mm_property_definitions_mindmapId_name_key" ON "mm_property_definitions"("mindmapId", "name");

-- CreateIndex
CREATE INDEX "mm_node_property_values_nodeId_idx" ON "mm_node_property_values"("nodeId");

-- CreateIndex
CREATE UNIQUE INDEX "mm_node_property_values_nodeId_propertyDefinitionId_key" ON "mm_node_property_values"("nodeId", "propertyDefinitionId");

-- CreateIndex
CREATE INDEX "mm_todos_userId_date_idx" ON "mm_todos"("userId", "date");

-- CreateIndex
CREATE INDEX "mm_todo_nodes_nodeId_idx" ON "mm_todo_nodes"("nodeId");

-- AddForeignKey
ALTER TABLE "mm_mindmaps" ADD CONSTRAINT "mm_mindmaps_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_nodes" ADD CONSTRAINT "mm_nodes_mindmapId_fkey" FOREIGN KEY ("mindmapId") REFERENCES "mm_mindmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_nodes" ADD CONSTRAINT "mm_nodes_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "mm_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_property_definitions" ADD CONSTRAINT "mm_property_definitions_mindmapId_fkey" FOREIGN KEY ("mindmapId") REFERENCES "mm_mindmaps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_node_property_values" ADD CONSTRAINT "mm_node_property_values_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "mm_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_node_property_values" ADD CONSTRAINT "mm_node_property_values_propertyDefinitionId_fkey" FOREIGN KEY ("propertyDefinitionId") REFERENCES "mm_property_definitions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_todos" ADD CONSTRAINT "mm_todos_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_todo_nodes" ADD CONSTRAINT "mm_todo_nodes_todoId_fkey" FOREIGN KEY ("todoId") REFERENCES "mm_todos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mm_todo_nodes" ADD CONSTRAINT "mm_todo_nodes_nodeId_fkey" FOREIGN KEY ("nodeId") REFERENCES "mm_nodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
