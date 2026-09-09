import { db, productsTable, consultantsTable, ordersTable, orderItemsTable, settingsTable, usersTable } from "@workspace/db";
import { writeFileSync, mkdirSync } from "fs";

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const dir = `./backups/${timestamp}`;
  mkdirSync(dir, { recursive: true });

  const tables: Record<string, any> = {
    products: await db.select().from(productsTable),
    consultants: await db.select().from(consultantsTable),
    orders: await db.select().from(ordersTable),
    orderItems: await db.select().from(orderItemsTable),
    settings: await db.select().from(settingsTable),
    users: await db.select().from(usersTable).then(rows => rows.map(({ passwordHash, ...rest }) => rest)),
  };

  for (const [name, data] of Object.entries(tables)) {
    writeFileSync(`${dir}/${name}.json`, JSON.stringify(data, null, 2), "utf-8");
    console.log(`${name}: ${(data as any[]).length} registros salvos`);
  }

  console.log(`\nBackup completo em: ${dir}`);
}

main().then(() => process.exit(0)).catch((err) => {
  console.error(err);
  process.exit(1);
});