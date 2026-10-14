-- AlterTable
ALTER TABLE "users" ADD COLUMN     "username" VARCHAR(20);

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");


-- 3 to 20 characters: lowercase letters, digits and inner hyphens.
ALTER TABLE "users"
  ADD CONSTRAINT "users_username_format" CHECK ("username" IS NULL OR "username" ~ '^[a-z0-9][a-z0-9-]{1,18}[a-z0-9]$');
