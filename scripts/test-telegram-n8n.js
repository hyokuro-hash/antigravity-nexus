/**
 * n8n and Telegram Integration Test Script
 * Run with: node --env-file=.env scripts/test-telegram-n8n.js
 */

const host = process.env.N8N_HOST;
const apiKey = process.env.N8N_API_KEY;
const botToken = process.env.TELEGRAM_BOT_TOKEN;
const chatId = process.env.TELEGRAM_CHAT_ID;

if (!host || !apiKey || !botToken || !chatId) {
  console.error("❌ Error: Missing required environment variables.");
  console.error("Please ensure N8N_HOST, N8N_API_KEY, TELEGRAM_BOT_TOKEN, and TELEGRAM_CHAT_ID are set in .env.");
  process.exit(1);
}

const baseUrl = host.replace(/\/$/, "");
const testMessage = "[n8n 연동 테스트] 메시지 발송 성공!";

async function sendDirectTelegramMessage() {
  console.log("📨 Sending direct message via Telegram Bot API...");
  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text: testMessage
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Telegram API Error: ${response.status} - ${errText}`);
  }

  const result = await response.json();
  console.log("✅ Direct Telegram message sent successfully!");
  return result;
}

async function getOrCreateN8nCredential() {
  console.log("🔑 Checking existing n8n credentials for Telegram...");
  
  // 1. List credentials
  const listResponse = await fetch(`${baseUrl}/api/v1/credentials`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-N8N-API-KEY": apiKey
    }
  });

  if (!listResponse.ok) {
    const errText = await listResponse.text();
    throw new Error(`n8n List Credentials Error: ${listResponse.status} - ${errText}`);
  }

  const credentialsList = await listResponse.json();
  const existingCred = credentialsList.data ? credentialsList.data.find(c => c.type === 'telegramApi') : null;

  if (existingCred) {
    console.log(`✅ Found existing Telegram credential in n8n (ID: ${existingCred.id})`);
    return existingCred.id;
  }

  // 2. Create new credential if not found
  console.log("🔑 Creating new Telegram credential in n8n...");
  const createResponse = await fetch(`${baseUrl}/api/v1/credentials`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Accept": "application/json",
      "X-N8N-API-KEY": apiKey
    },
    body: JSON.stringify({
      name: "Telegram Integration Test Bot",
      type: "telegramApi",
      data: {
        accessToken: botToken
      }
    })
  });

  if (!createResponse.ok) {
    const errText = await createResponse.text();
    throw new Error(`n8n Create Credential Error: ${createResponse.status} - ${errText}`);
  }

  const newCred = await createResponse.json();
  console.log(`✅ Created Telegram credential successfully (ID: ${newCred.id})`);
  return newCred.id;
}

async function createN8nWorkflow(credentialId) {
  console.log("📁 Processing n8n workflow with Manual Trigger & Telegram node...");

  const workflowPayload = {
    name: "Telegram Integration Test Workflow",
    nodes: [
      {
        parameters: {},
        id: "manual-trigger-node-id",
        name: "When clicking \"Execute Workflow\"",
        type: "n8n-nodes-base.manualTrigger",
        typeVersion: 1,
        position: [250, 250]
      },
      {
        parameters: {
          chatId: chatId,
          text: testMessage
        },
        id: "telegram-node-id",
        name: "Telegram",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [450, 250],
        credentials: {
          telegramApi: {
            id: credentialId,
            name: "Telegram account"
          }
        }
      }
    ],
    connections: {
      "When clicking \"Execute Workflow\"": {
        "main": [
          [
            {
              "node": "Telegram",
              "type": "main",
              "index": 0
            }
          ]
        ]
      }
    },
    settings: {}
  };

  // 1. Check if workflow already exists
  const listResponse = await fetch(`${baseUrl}/api/v1/workflows`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
      "X-N8N-API-KEY": apiKey
    }
  });

  let existingId = null;
  if (listResponse.ok) {
    const listData = await listResponse.json();
    const existingWorkflow = (listData.data || []).find(w => w.name === workflowPayload.name);
    if (existingWorkflow) {
      existingId = existingWorkflow.id;
    }
  }

  let response;
  if (existingId) {
    console.log(`🔄 Existing workflow found (ID: ${existingId}). Updating...`);
    response = await fetch(`${baseUrl}/api/v1/workflows/${existingId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-N8N-API-KEY": apiKey
      },
      body: JSON.stringify(workflowPayload)
    });
  } else {
    console.log("📁 Creating new workflow...");
    response = await fetch(`${baseUrl}/api/v1/workflows`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-N8N-API-KEY": apiKey
      },
      body: JSON.stringify(workflowPayload)
    });
  }

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`n8n Process Workflow Error: ${response.status} - ${errText}`);
  }

  const resultWorkflow = await response.json();
  const workflowUrl = `${baseUrl}/workflow/${resultWorkflow.id}`;
  console.log(`✅ Workflow processed successfully (ID: ${resultWorkflow.id})`);
  console.log(`🔗 Access the workflow here: ${workflowUrl}`);
  return { id: resultWorkflow.id, url: workflowUrl };
}

async function run() {
  let telegramSuccess = false;
  try {
    // Step 1: Send Telegram message directly to verify credentials
    await sendDirectTelegramMessage();
    telegramSuccess = true;
  } catch (error) {
    console.warn("\n⚠️ Telegram message dispatch failed directly:");
    console.warn(error.message);
    console.warn("💡 Tip: Make sure your Telegram Bot (@K_Jarvis_ai_bot) has been started by the user first!");
    console.warn("Continuing to setup n8n credentials and workflow...\n");
  }

  try {
    // Step 2: Ensure Telegram Credential exists in n8n
    const credentialId = await getOrCreateN8nCredential();

    // Step 3: Create the test workflow in n8n
    const workflow = await createN8nWorkflow(credentialId);

    if (telegramSuccess) {
      console.log("\n🚀 Integration test completed successfully!");
    } else {
      console.log("\n🚀 n8n workspace setup complete! However, the Telegram message test needs verification after you start the bot.");
    }
  } catch (error) {
    console.error("\n❌ Integration setup failed!");
    console.error(error.message);
    process.exit(1);
  }
}

run();
