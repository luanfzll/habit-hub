-- AlterTable
ALTER TABLE "habit_entries" ADD COLUMN     "skip_reason" VARCHAR(200);

-- Only skipped days carry a reason, and never an empty one.
ALTER TABLE "habit_entries"
  ADD CONSTRAINT "habit_entries_reason_only_when_skipped"
  CHECK ("skip_reason" IS NULL OR ("skipped" AND btrim("skip_reason") <> ''));
