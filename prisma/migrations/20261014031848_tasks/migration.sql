-- CreateTable
CREATE TABLE "tasks" (
    "id" UUID NOT NULL,
    "user_id" TEXT NOT NULL,
    "title" VARCHAR(120) NOT NULL,
    "created_for" DATE NOT NULL,
    "completed_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tasks_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "tasks_user_id_completed_on_idx" ON "tasks"("user_id", "completed_on");

-- AddForeignKey
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Titles cannot be blank.
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_title_not_blank" CHECK (btrim("title") <> '');
