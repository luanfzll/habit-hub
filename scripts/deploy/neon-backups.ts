/**
 * Backups of the production database as Neon branches, created right before each
 * migration. A branch without a compute endpoint costs no compute; only the most
 * recent ones are kept, which also bounds how long data from deleted accounts lingers.
 */

export const BACKUP_PREFIX = "backup-";
export const BACKUPS_TO_KEEP = 3;

export interface NeonBranch {
  id: string;
  name: string;
  default?: boolean;
  primary?: boolean;
  created_at: string;
}

export function backupName(now: Date): string {
  return `${BACKUP_PREFIX}${now.toISOString().replace(/[:.]/g, "-")}`;
}

/** Backups to delete so that, once a new one is created, only `keep` remain. */
export function backupsToDelete(branches: NeonBranch[], keep = BACKUPS_TO_KEEP): NeonBranch[] {
  return branches
    .filter((branch) => branch.name.startsWith(BACKUP_PREFIX) && !branch.default && !branch.primary)
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(Math.max(keep - 1, 0));
}

export function neonClient(apiKey: string, projectId: string) {
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    const response = await fetch(`https://console.neon.tech/api/v2/projects/${projectId}${path}`, {
      ...init,
      headers: { Authorization: `Bearer ${apiKey}`, Accept: "application/json", "Content-Type": "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Neon API ${init.method ?? "GET"} ${path} failed: ${response.status} ${await response.text()}`);
    }
    return (await response.json()) as T;
  }

  return {
    listBranches: () => request<{ branches: NeonBranch[] }>("/branches").then((body) => body.branches),
    createBranch: (name: string, parentId: string) =>
      request("/branches", { method: "POST", body: JSON.stringify({ branch: { name, parent_id: parentId } }) }),
    deleteBranch: (id: string) => request(`/branches/${id}`, { method: "DELETE" }),
  };
}

/** Creates a backup of the default branch, then removes the oldest backups. Returns the new backup's name. */
export async function backupProductionDatabase(apiKey: string, projectId: string, now = new Date()): Promise<string> {
  const neon = neonClient(apiKey, projectId);
  const branches = await neon.listBranches();
  const production = branches.find((branch) => branch.default) ?? branches.find((branch) => branch.primary);
  if (!production) throw new Error("Could not find the default Neon branch");

  const name = backupName(now);
  await neon.createBranch(name, production.id);
  for (const old of backupsToDelete(branches)) {
    await neon.deleteBranch(old.id);
  }
  return name;
}
