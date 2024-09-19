-- CreateEnum
CREATE TYPE "Role" AS ENUM ('admin', 'vendor');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "username" VARCHAR(255) NOT NULL,
    "password" VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255) NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'vendor',

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgets" (
    "id" UUID NOT NULL,
    "clientName" VARCHAR(255) NOT NULL,
    "vendorId" UUID NOT NULL,

    CONSTRAINT "budgets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "budgetItems" (
    "id" UUID NOT NULL,
    "description" TEXT NOT NULL,
    "unitValue" DOUBLE PRECISION NOT NULL,
    "quantity" INTEGER NOT NULL,
    "budgetId" UUID NOT NULL,

    CONSTRAINT "budgetItems_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- AddForeignKey
ALTER TABLE "budgets" ADD CONSTRAINT "budgets_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "budgetItems" ADD CONSTRAINT "budgetItems_budgetId_fkey" FOREIGN KEY ("budgetId") REFERENCES "budgets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
