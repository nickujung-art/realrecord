// Seed intentionally disabled after Supabase migration.
// Real data is populated via: npx tsx scripts/ingest-historical.ts
async function main() {
  console.log("🌱 Seed skipped — use ingest-historical.ts to populate from MOLIT API.");
}
main().catch((e) => { console.error(e); process.exit(1); });
