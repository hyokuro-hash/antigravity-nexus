/**
 * Create All-in-One Credentials Test Workflow in n8n
 * Run with: node --env-file=.env scripts/create-all-tests.js
 */

const host = process.env.N8N_HOST;
const apiKey = process.env.N8N_API_KEY;

if (!host || !apiKey) {
  console.error("❌ Error: Missing required environment variables N8N_HOST or N8N_API_KEY.");
  process.exit(1);
}

const baseUrl = host.replace(/\/$/, "");

async function createWorkflow() {
  console.log("📁 Creating Credentials Verification Workflow in n8n...");

  const payload = {
    name: "Credentials Verification Workflow",
    nodes: [
      {
        parameters: {},
        id: "manual-trigger",
        name: "Manual Trigger",
        type: "n8n-nodes-base.manualTrigger",
        typeVersion: 1,
        position: [100, 300]
      },
      {
        parameters: {
          resource: "file",
          operation: "list"
        },
        id: "google-drive-test",
        name: "Google Drive Test",
        type: "n8n-nodes-base.googleDrive",
        typeVersion: 2,
        position: [400, 100],
        credentials: {
          googleDriveOAuth2Api: {
            id: "hSyO4aWiIasKUWc7",
            name: "Google Drive API"
          }
        }
      },
      {
        parameters: {
          promptType: "define",
          prompt: "간단한 테스트 인사 한 마디 해줘."
        },
        id: "google-gemini-test",
        name: "Google Gemini Test",
        type: "@n8n/n8n-nodes-langchain.chainLlm",
        typeVersion: 1,
        position: [400, 200],
        onError: "continue"
      },
      {
        parameters: {
          modelName: "models/gemini-3.6-flash",
          options: {}
        },
        id: "google-gemini-model",
        name: "Google Gemini Chat Model",
        type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        typeVersion: 1,
        position: [600, 200],
        credentials: {
          googlePalmApi: {
            id: "1weC7W7NT1xfrtFR",
            name: "Google Gemini API"
          }
        }
      },
      {
        parameters: {
          method: "POST",
          authentication: "genericCredentialType",
          genericAuthType: "httpHeaderAuth",
          url: "https://api.tavily.com/search",
          sendBody: true,
          specifyBody: "json",
          jsonBody: "{\n  \"query\": \"n8n\"\n}",
          options: {}
        },
        id: "tavily-test",
        name: "Tavily API Test",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.1,
        position: [400, 300],
        credentials: {
          httpHeaderAuth: {
            id: "i2ipHBcUj9lGKIpC",
            name: "Tavily API"
          }
        },
        onError: "continue"
      },
      {
        parameters: {
          method: "GET",
          authentication: "none",
          url: "https://api.apiframe.ai/v2/me",
          sendHeaders: true,
          specifyHeaders: "json",
          jsonHeaders: `{\n  "X-API-Key": "${process.env.APIFRAME_API_KEY || ''}"\n}`,
          options: {}
        },
        id: "apiframe-test",
        name: "Apiframe API Test",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.1,
        position: [400, 400],
        onError: "continue"
      },
      {
        parameters: {
          method: "GET",
          authentication: "none",
          url: "https://api.apify.com/v2/users/me",
          sendHeaders: true,
          specifyHeaders: "json",
          jsonHeaders: `{\n  "Authorization": "Bearer ${process.env.APIFY_API_KEY || ''}"\n}`,
          options: {}
        },
        id: "apify-test",
        name: "Apify API Test",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.1,
        position: [400, 500],
        onError: "continue"
      },
      {
        parameters: {
          operation: "getAll",
          documentId: {
            __rl: true,
            value: "1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0",
            mode: "id"
          },
          sheetName: {
            __rl: true,
            value: "시트1",
            mode: "list"
          },
          options: {}
        },
        id: "google-sheets-read-test",
        name: "Google Sheets - Read Test",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [400, 600],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        },
        onError: "continue"
      },
      {
        parameters: {
          operation: "append",
          documentId: {
            __rl: true,
            value: "1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0",
            mode: "id"
          },
          sheetName: {
            __rl: true,
            value: "시트1",
            mode: "list"
          },
          columns: {
            mappingMode: "defineBelow",
            value: {
              ID: "=CNT_TEST_{{ $now.format('yyyyMMdd_HHmmss') }}",
              Status: "1차대기",
              Trigger_Type: "Manual",
              Topic_Raw: "n8n Google Sheets Chained Test"
            },
            schema: []
          },
          options: {}
        },
        id: "google-sheets-append-test",
        name: "Google Sheets - Append Test",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [600, 600],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        },
        onError: "continue"
      },
      {
        parameters: {
          operation: "update",
          documentId: {
            __rl: true,
            value: "1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0",
            mode: "id"
          },
          sheetName: {
            __rl: true,
            value: "시트1",
            mode: "list"
          },
          columns: {
            mappingMode: "defineBelow",
            value: {
              ID: "={{ $json.ID }}",
              Status: "1차승인"
            },
            matchingColumns: [
              "ID"
            ],
            schema: []
          },
          options: {}
        },
        id: "google-sheets-update-test",
        name: "Google Sheets - Update Test",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [800, 600],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        },
        onError: "continue"
      }
    ],
    connections: {
      "Manual Trigger": {
        "main": [
          [
            { node: "Google Drive Test", type: "main", index: 0 },
            { node: "Google Gemini Test", type: "main", index: 0 },
            { node: "Tavily API Test", type: "main", index: 0 },
            { node: "Apiframe API Test", type: "main", index: 0 },
            { node: "Apify API Test", type: "main", index: 0 },
            { node: "Google Sheets - Read Test", type: "main", index: 0 }
          ]
        ]
      },
      "Google Sheets - Read Test": {
        "main": [
          [
            { node: "Google Sheets - Append Test", type: "main", index: 0 }
          ]
        ]
      },
      "Google Sheets - Append Test": {
        "main": [
          [
            { node: "Google Sheets - Update Test", type: "main", index: 0 }
          ]
        ]
      },
      "Google Gemini Chat Model": {
        "ai_languageModel": [
          [
            {
              node: "Google Gemini Test",
              type: "ai_languageModel",
              index: 0
            }
          ]
        ]
      }
    },
    settings: {}
  };

  try {
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
      const existingWorkflow = (listData.data || []).find(w => w.name === payload.name);
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
        body: JSON.stringify(payload)
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
        body: JSON.stringify(payload)
      });
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${await response.text()}`);
    }

    const data = await response.json();
    const workflowUrl = `${baseUrl}/workflow/${data.id}`;
    console.log(`✅ Credentials Verification Workflow processed successfully (ID: ${data.id})`);
    console.log(`🔗 Link to open in n8n: ${workflowUrl}`);
  } catch (error) {
    console.error("❌ Failed to process workflow:", error.message);
    process.exit(1);
  }
}

createWorkflow();
