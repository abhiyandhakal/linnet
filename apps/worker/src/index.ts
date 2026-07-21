import { sql } from "drizzle-orm";
import { getConfig } from "@linnet/config";
import { createDb, jobs } from "@linnet/db";
import { processJob } from "@linnet/api/job-processor";

const config = getConfig();
const db = createDb(config.DATABASE_URL);

async function claimJob() {
  const now = new Date();
  const claimed = await db.execute(sql`
    select id, type from jobs
    where status = 'queued' and available_at <= ${now}
    order by available_at asc
    for update skip locked
    limit 1
  `);
  return claimed[0] as { id: string; type: string } | undefined;
}

/* Legacy local worker wrapper; production dispatch is handled by Vercel Queues. */
async function tick() {
  const job = await claimJob();
  if (!job) return;
  await processJob({ jobId: job.id, type: job.type });
}

setInterval(() => void tick(), 1_000);
console.log("Linnet local queue poller started");
