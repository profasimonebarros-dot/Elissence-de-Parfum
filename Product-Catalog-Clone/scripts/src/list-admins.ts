import { db, usersTable } from "@workspace/db";

const users = await db
  .select({
    id: usersTable.id,
    name: usersTable.name,
    email: usersTable.email,
    role: usersTable.role,
    active: usersTable.active,
  })
  .from(usersTable);

console.log(JSON.stringify(users, null, 2));
process.exit(0);