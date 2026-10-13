import { describe, expect, it } from "vitest";
import { backupName, backupsToDelete, type NeonBranch } from "./neon-backups";

const branch = (name: string, created_at: string, extra: Partial<NeonBranch> = {}): NeonBranch => ({
  id: name,
  name,
  created_at,
  ...extra,
});

describe("backupsToDelete", () => {
  const branches = [
    branch("main", "2026-01-01T00:00:00Z", { default: true }),
    branch("backup-1", "2026-10-01T00:00:00Z"),
    branch("backup-2", "2026-10-02T00:00:00Z"),
    branch("backup-3", "2026-10-03T00:00:00Z"),
    branch("preview/feat-x", "2026-10-04T00:00:00Z"),
  ];

  it("keeps the two newest so the new backup makes three", () => {
    expect(backupsToDelete(branches).map((b) => b.name)).toEqual(["backup-1"]);
  });

  it("never touches the production branch or other branches", () => {
    const deleted = backupsToDelete(branches, 1).map((b) => b.name);
    expect(deleted).toEqual(["backup-3", "backup-2", "backup-1"]);
    expect(deleted).not.toContain("main");
    expect(deleted).not.toContain("preview/feat-x");
  });

  it("deletes nothing while there is room", () => {
    expect(backupsToDelete([branch("backup-1", "2026-10-01T00:00:00Z")])).toEqual([]);
  });
});

describe("backupName", () => {
  it("is sortable and safe for Neon branch names", () => {
    expect(backupName(new Date("2026-10-13T18:22:14.123Z"))).toBe("backup-2026-10-13T18-22-14-123Z");
  });
});
