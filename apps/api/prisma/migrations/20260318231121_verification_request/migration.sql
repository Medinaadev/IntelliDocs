/*
  Warnings:

  - Made the column `userId` on table `VerificationRequest` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE "VerificationRequest" DROP CONSTRAINT "VerificationRequest_userId_fkey";

-- AlterTable
ALTER TABLE "VerificationRequest" ALTER COLUMN "userId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
