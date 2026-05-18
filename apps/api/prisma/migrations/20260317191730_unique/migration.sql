/*
  Warnings:

  - You are about to drop the column `providerId` on the `Account` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[providerType,providerAccountId]` on the table `Account` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Account_providerId_providerAccountId_key";

-- AlterTable
ALTER TABLE "Account" DROP COLUMN "providerId";

-- CreateIndex
CREATE UNIQUE INDEX "Account_providerType_providerAccountId_key" ON "Account"("providerType", "providerAccountId");
