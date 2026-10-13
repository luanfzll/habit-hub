import { randomUUID } from "node:crypto";
import { db } from "@/server/db";

export async function createUser(timezone = "America/Sao_Paulo") {
  const id = randomUUID();
  return db.user.create({
    data: { id, name: "Test", email: `${id}@example.com`, timezone },
  });
}
