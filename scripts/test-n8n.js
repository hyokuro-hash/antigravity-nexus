/**
 * n8n API Connection Test Script
 * Run with: node --env-file=.env scripts/test-n8n.js
 */

const host = process.env.N8N_HOST;
const apiKey = process.env.N8N_API_KEY;

if (!host || !apiKey) {
  console.error("❌ Error: N8N_HOST or N8N_API_KEY is not defined in environment variables.");
  console.error("Please verify that your .env file exists and contains both variables.");
  process.exit(1);
}

// Clean host URL (ensure no trailing slash)
const baseUrl = host.replace(/\/$/, "");

async function testConnection() {
  console.log(`🔌 Connecting to n8n host: ${baseUrl}...`);
  
  try {
    const response = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'X-N8N-API-KEY': apiKey
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
    }

    const data = await response.json();
    console.log("✅ Connection successful!");
    console.log(`📁 Total Workflows Found: ${data.data ? data.data.length : 0}`);
    
    if (data.data && data.data.length > 0) {
      console.log("\nRecent Workflows:");
      data.data.slice(0, 5).forEach((workflow, index) => {
        console.log(`  [${index + 1}] ID: ${workflow.id} | Name: ${workflow.name} | Active: ${workflow.active}`);
      });
    } else {
      console.log("No workflows found in this account.");
    }
  } catch (error) {
    console.error("❌ Connection failed!");
    console.error(error.message);
    process.exit(1);
  }
}

testConnection();
