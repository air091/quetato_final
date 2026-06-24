/*
  Warnings:

  - You are about to drop the column `role` on the `User` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "UserType" AS ENUM ('user', 'static');

-- AlterTable
ALTER TABLE "User" DROP COLUMN "role",
ADD COLUMN     "type" "UserType" NOT NULL DEFAULT 'user';

-- DropEnum
DROP TYPE "UserRole";
