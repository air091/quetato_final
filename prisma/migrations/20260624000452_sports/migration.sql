/*
  Warnings:

  - Added the required column `sport` to the `Session` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "Sports" AS ENUM ('badminton');

-- AlterTable
ALTER TABLE "Session" ADD COLUMN     "sport" "Sports" NOT NULL;
