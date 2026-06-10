import type { ChangePlan, RenderResult } from "../types.js";

export function printPlan(plan: ChangePlan, dryRun: boolean): void {
  console.log(`${dryRun ? "Preview" : "Applied"}: ${plan.writes.length} write(s), ${plan.deletes.length} delete(s), ${plan.unchanged.length} unchanged`);
  if (plan.writes.length) console.log(`Writes:\n${plan.writes.map((item) => `  + ${item.path}`).join("\n")}`);
  if (plan.deletes.length) console.log(`Deletes:\n${plan.deletes.map((item) => `  - ${item}`).join("\n")}`);
  if (plan.conflicts.length) {
    console.error(`Conflicts:\n${plan.conflicts.map((item) => `  ! ${item.path} (${item.reason})`).join("\n")}`);
    for (const conflict of plan.conflicts) {
      if (conflict.diff) console.error(conflict.diff);
    }
  }
}

export function printMigration(result: RenderResult): void {
  console.log(`Migration report: ${result.converted.length} converted, ${result.copied.length} copied, ${result.unsupported.length} unsupported, ${result.skipped.length} skipped`);
  for (const item of result.unsupported) {
    console.log(`  unsupported ${item.path}: ${item.reason}`);
  }
}
