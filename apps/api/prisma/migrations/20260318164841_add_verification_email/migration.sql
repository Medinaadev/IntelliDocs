/*
  Warnings:

  - You are about to drop the column `identifier` on the `VerificationRequest` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "VerificationRequest_identifier_token_key";

-- AlterTable
ALTER TABLE "VerificationRequest" DROP COLUMN "identifier",
ADD COLUMN     "userId" TEXT;

-- AddForeignKey
ALTER TABLE "VerificationRequest" ADD CONSTRAINT "VerificationRequest_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
