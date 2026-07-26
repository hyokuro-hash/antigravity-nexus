/**
 * Clean up duplicate n8n workflows and keep only the latest one by name.
 * Run with: node --env-file=.env scripts/cleanup-workflows.js
 */

const host = process.env.N8N_HOST;
const apiKey = process.env.N8N_API_KEY;

if (!host || !apiKey) {
  console.error("❌ Error: Missing required environment variables N8N_HOST or N8N_API_KEY.");
  process.exit(1);
}

const baseUrl = host.replace(/\/$/, "");

async function cleanup() {
  console.log("🔍 Fetching all workflows from n8n...");

  try {
    // 1. Get all workflows
    const response = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: "GET",
      headers: {
        "Accept": "application/json",
        "X-N8N-API-KEY": apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const result = await response.json();
    const workflows = result.data || [];

    console.log(`📊 Found ${workflows.length} total workflows.`);

    // Target workflow names to clean up
    const targets = ["Credentials Verification Workflow", "Telegram Integration Test Workflow"];

    // Group by name
    const grouped = {};
    workflows.forEach(w => {
      if (!grouped[w.name]) {
        grouped[w.name] = [];
      }
      grouped[w.name].push(w);
    });

    // Process targets
    for (const name of targets) {
      const list = grouped[name] || [];
      if (list.length <= 1) {
        console.log(`✅ No duplicates found for "${name}" (Count: ${list.length}).`);
        continue;
      }

      // Sort by updatedAt descending (latest first)
      list.sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));

      const keep = list[0];
      const toDelete = list.slice(1);

      console.log(`📌 Target "${name}":`);
      console.log(`   - KEEPER: ID: ${keep.id} | Updated: ${keep.updatedAt}`);

      for (const w of toDelete) {
        console.log(`   - DELETING: ID: ${w.id} | Updated: ${w.updatedAt}`);
        const delResp = await fetch(`${baseUrl}/api/v1/workflows/${w.id}`, {
          method: "DELETE",
          headers: {
            "Accept": "application/json",
            "X-N8N-API-KEY": apiKey
          }
        });

        if (!delResp.ok) {
          console.error(`     ❌ Failed to delete ID ${w.id}: ${await delResp.text()}`);
        } else {
          console.log(`     ✅ Successfully deleted ID ${w.id}`);
        }
      }
    }

    console.log("🎉 Cleanup process complete!");
  } catch (error) {
    console.error("❌ Cleanup failed:", error.message);
    process.exit(1);
  }
}

cleanup();
