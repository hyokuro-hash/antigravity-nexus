/**
 * Create Combined Research, AI QA & Telegram Callback Workflow in n8n (Consolidated Data Storage & Fix Telegram inline_keyboard snake_case)
 * Run with: node --env-file=.env scripts/create-all-tests.js
 */

const host = process.env.N8N_HOST;
const apiKey = process.env.N8N_API_KEY;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;

if (!host || !apiKey || !telegramChatId) {
  console.error("❌ Error: Missing required environment variables N8N_HOST, N8N_API_KEY, or TELEGRAM_CHAT_ID.");
  process.exit(1);
}

const baseUrl = host.replace(/\/$/, "");

async function createWorkflow() {
  console.log("📁 Creating Combined Research, QA & Telegram Callback Workflow in n8n...");

  const payload = {
    name: "Credentials Verification Workflow",
    nodes: [
      // ==========================================
      // FLOW 1: Topic Selection, Research & QA (Linear - Y: 300)
      // ==========================================
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
          documentId: {
            __rl: true,
            value: "1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0",
            mode: "id"
          },
          sheetName: {
            __rl: true,
            value: "gid=0",
            mode: "list",
            cachedResultName: "시트1",
            cachedResultUrl: "https://docs.google.com/spreadsheets/d/1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0/edit#gid=0"
          },
          options: {}
        },
        id: "google-sheets-read-node",
        name: "0. 기존 주제 목록 조회",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [300, 300],
        alwaysOutputData: true,
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        }
      },
      {
        parameters: {
          jsCode: `// 이 노드는 여러 개의 구글 시트 행(아이템)들을 단 하나의 아이템으로 병합하여,
// 다운스트림 노드들이 행 개수만큼 반복 실행되는 현상을 방지합니다.
const topics = $input.all().map(item => item.json.Topic_Raw).filter(Boolean);
return {
  topics: topics
};`
        },
        id: "merge-topics-node",
        name: "0-1. 기존 주제 병합",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [500, 300]
      },
      {
        parameters: {
          method: "POST",
          authentication: "genericCredentialType",
          genericAuthType: "httpHeaderAuth",
          url: "https://api.tavily.com/search",
          sendBody: true,
          specifyBody: "json",
          jsonBody: "{\n  \"query\": \"오늘의 주요 기술 뉴스 트렌드\"\n}",
          options: {}
        },
        id: "tavily-search",
        name: "1. 실시간 트렌드 검색",
        type: "n8n-nodes-base.httpRequest",
        typeVersion: 4.1,
        position: [700, 300],
        credentials: {
          httpHeaderAuth: {
            id: "i2ipHBcUj9lGKIpC",
            name: "Tavily API"
          }
        }
      },
      {
        parameters: {
          promptType: "define",
          prompt: `=# [한글 주석] 이 노드는 실시간 트렌드를 검색하여 최신 주제 1개를 선정하고 관련 팩트를 조사합니다.\n# (This node selects a trending tech topic and gathers research facts with proper citations)\n\nYou are a professional IT/Tech trend editor.\nAnalyze the provided real-time search results: {{ JSON.stringify($json.results) }}\n\n1. Automatically select ONE latest, most engaging tech/IT topic.\n   * Start your output with the exact line "자동 선정 주제: [Selected Topic Name]" (Do NOT translate this header, keep it in Korean).\n   * Avoid topics in this list (prevent duplicates):\n     {{ $('0-1. 기존 주제 병합').first().json.topics.join(', ') || 'None' }}\n2. Conduct research and structure the outline following these rules:\n   * Identify 3 core Facts. Each fact MUST include a numbered citation link mapping to a URL in the search results (e.g., [1], [2]).\n   * Identify relevant statistics or concrete real-world cases.\n   * Provide the reference URLs list at the end.\n\nIMPORTANT: Write the entire research report in natural, professional Korean.`
        },
        id: "research-node",
        name: "2. 자동 주제 선정 & 자료 조사",
        type: "@n8n/n8n-nodes-langchain.chainLlm",
        typeVersion: 1,
        position: [900, 300],
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 35000
      },
      {
        parameters: {
          modelName: "models/gemini-3.6-flash",
          options: {}
        },
        id: "gemini-chat-model-research",
        name: "Gemini Chat Model - Research",
        type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        typeVersion: 1,
        position: [900, 450],
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 35000,
        credentials: {
          googlePalmApi: {
            id: "1weC7W7NT1xfrtFR",
            name: "Google Gemini API"
          }
        }
      },
      {
        parameters: {
          promptType: "define",
          prompt: `=# [한글 주석] 이 노드는 자료 조사 내용을 기반으로 높은 완수율을 보장하는 숏폼용 가대본을 작성합니다.\n# (This node drafts a high-retention short-form script based on the research facts)\n\nYou are a professional short-form content planner and scriptwriter.\nBased on the research results: {{ $json.text }}\n\nIf there is retry feedback, adapt the writing to address the feedback:\n{{ $json.feedback ? 'Feedback: ' + $json.feedback : '' }}\n\nStructure the script outline using the following guidelines:\n1. Planning Intention & Target Audience: (Explain the target audience and relevance)\n2. High-Retention Hook (First 3 seconds): Must choose one of these 3 high-retention patterns:\n   * Data-driven (e.g. "지난 한 달간 AI에게 500개의 리뷰를 분석시켰더니...")\n   * Surprising Question (e.g. "아침 커피를 마시기 전에 전 세계 모든 고객 리뷰를 읽을 수 있다면?")\n   * Personal Storytelling (e.g. "철수는 2주 동안 엉뚱한 기능을 만들었습니다...")\n3. Draft Script Table:\n   * Format: | Visual (화면 연출) | Audio (나레이션/자막) |\n   * Visual column guideline: Incorporate brand style cues (e.g. recommend warm light backgrounds \`#faf9f5\`, dark gray elements \`#141413\`, accent colors like \`#d97757\`, and clean Poppins/Lora typography).\n4. Call to Action (CTA)\n\nIMPORTANT: Write the entire script and outline in natural, engaging Korean.`
        },
        id: "planning-node",
        name: "2-1. 콘텐츠 기획 및 가대본 제작",
        type: "@n8n/n8n-nodes-langchain.chainLlm",
        typeVersion: 1,
        position: [1100, 300],
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 35000
      },
      {
        parameters: {
          modelName: "models/gemini-3.6-flash",
          options: {}
        },
        id: "gemini-chat-model-planning",
        name: "Gemini Chat Model - Planning",
        type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        typeVersion: 1,
        position: [1100, 450],
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 35000,
        credentials: {
          googlePalmApi: {
            id: "1weC7W7NT1xfrtFR",
            name: "Google Gemini API"
          }
        }
      },
      {
        parameters: {
          jsCode: "let research_text = \"\";\ntry {\n  // Try to read from automatic research node (Flow 1)\n  research_text = $('2. 자동 주제 선정 & 자료 조사').first().json.text;\n} catch (e) {\n  // If Node 2 didn't run, we are in retry mode (Flow 2).\n  // Use the previous script draft as reference research text.\n  try {\n    research_text = $('Format Retry Input').first().json.text;\n  } catch (err) {\n    research_text = \"이전 대본 수정본 검수\";\n  }\n}\n\nlet row_id = \"\";\ntry {\n  row_id = $('Format Retry Input').first().json.row_id;\n} catch (e) {\n  row_id = \"\";\n}\n\nreturn {\n  research_text,\n  script_draft: $input.item.json.text,\n  row_id\n};"
        },
        id: "prepare-qa-input",
        name: "Prepare QA Input",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [1300, 300]
      },
      {
        parameters: {
          promptType: "define",
          prompt: `=# [한글 주석] 이 노드는 자료 조사 결과와 대본의 정합성, 가독성, 브랜드 가이드를 기반으로 자동 평가합니다.\n# (This node compares the script and research to evaluate factuality, hooks, and brand alignment)\n\nCompare the generated script with the original research to verify factual accuracy and quality.\n\nOriginal Research:\n{{ $('2. 자동 주제 선정 & 자료 조사').first().json.text }}\n\nGenerated Script:\n{{ $json.script_draft }}\n\nEvaluate across 5 key criteria (score 1-10 each):\n1. trend: Is it trendy and relevant to tech?\n2. hook: Is the hook strong and does it match one of the 3 specified patterns?\n3. structure: Is the screen/narration structure clean for short-form?\n4. fact_accuracy: Does the facts match the original research without hallucination?\n5. brand_consistency: Does the visual direction recommend Anthropic's brand colors (#141413, #faf9f5, #d97757) and clean Poppins/Lora font overlays?\n\nPass/Fail Criteria:\n- Average score across all 5 criteria must be >= 7 for pass to be true.\n\nRespond ONLY with a valid JSON block. No markdown backticks, no explanations. First character must be {\n{\n  "pass": true or false,\n  "score": {"trend": 8, "hook": 7, "structure": 8, "fact_accuracy": 9, "brand_consistency": 8},\n  "feedback": "Detail explanation if pass is false"\n}`
        },
        id: "qa-node",
        name: "3. AI 1차 검수",
        type: "@n8n/n8n-nodes-langchain.chainLlm",
        typeVersion: 1,
        position: [1500, 300],
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 35000
      },
      {
        parameters: {
          modelName: "models/gemini-3.6-flash",
          options: {}
        },
        id: "gemini-chat-model-qa",
        name: "Gemini Chat Model - QA",
        type: "@n8n/n8n-nodes-langchain.lmChatGoogleGemini",
        typeVersion: 1,
        position: [1500, 450],
        retryOnFail: true,
        maxTries: 3,
        waitBetweenTries: 35000,
        credentials: {
          googlePalmApi: {
            id: "1weC7W7NT1xfrtFR",
            name: "Google Gemini API"
          }
        }
      },
      {
        parameters: {
          jsCode: "let text = $input.item.json.text || \"\";\nlet pass = false;\nlet score = 5;\nlet feedback = \"JSON 파싱 실패\";\n\n// Clean any markdown code blocks\nlet cleanedText = text.replace(/```json|```/gi, \"\").trim();\nconst jsonMatch = cleanedText.match(/({[\\s\\S]*?})/);\nif (jsonMatch) {\n  const rawJson = jsonMatch[1];\n  try {\n    const parsed = JSON.parse(rawJson);\n    pass = parsed.pass === true;\n    \n    let scoreObj = parsed.score;\n    if (typeof scoreObj === 'object' && scoreObj !== null) {\n      let sum = 0;\n      let count = 0;\n      for (let k in scoreObj) {\n        sum += parseInt(scoreObj[k]) || 0;\n        count++;\n      }\n      score = count > 0 ? Math.round(sum / count) : 5;\n    } else {\n      score = parseInt(scoreObj) || 5;\n    }\n    feedback = parsed.feedback || \"\";\n  } catch (e) {\n    // Fallback parsing via Regex if JSON contains unescaped quotes\n    try {\n      const passM = rawJson.match(/\"pass\"\\s*:\\s*(true|false)/i);\n      pass = passM ? passM[1].toLowerCase() === 'true' : false;\n      \n      let scoreObj = null;\n      const scoreM = rawJson.match(/\"score\"\\s*:\\s*({[\\s\\S]*?})/);\n      if (scoreM) {\n        try {\n          scoreObj = JSON.parse(scoreM[1]);\n        } catch(err) {\n          const trendM = scoreM[1].match(/\"trend\"\\s*:\\s*(\\d+)/);\n          const hookM = scoreM[1].match(/\"hook\"\\s*:\\s*(\\d+)/);\n          const structM = scoreM[1].match(/\"structure\"\\s*:\\s*(\\d+)/);\n          const factM = scoreM[1].match(/\"fact_accuracy\"\\s*:\\s*(\\d+)/);\n          scoreObj = {\n            trend: trendM ? parseInt(trendM[1]) : 7,\n            hook: hookM ? parseInt(hookM[1]) : 7,\n            structure: structM ? parseInt(structM[1]) : 7,\n            fact_accuracy: factM ? parseInt(factM[1]) : 7\n          };\n        }\n      } else {\n        const scoreNumM = rawJson.match(/\"score\"\\s*:\\s*(\\d+)/);\n        if (scoreNumM) score = parseInt(scoreNumM[1]);\n      }\n      \n      if (scoreObj && typeof scoreObj === 'object') {\n        let sum = 0;\n        let count = 0;\n        for (let k in scoreObj) {\n          sum += parseInt(scoreObj[k]) || 0;\n          count++;\n        }\n        score = count > 0 ? Math.round(sum / count) : 5;\n      }\n      \n      const feedbackM = rawJson.match(/\"feedback\"\\s*:\\s*\"([\\s\\S]*?)\"\\s*\\}\\s*$/) || rawJson.match(/\"feedback\"\\s*:\\s*\"([\\s\\S]*?)\"/);\n      feedback = feedbackM ? feedbackM[1] : \"피드백 파싱 실패 (정규식)\";\n    } catch (fallbackErr) {\n      feedback = \"JSON 파싱 에러: \" + e.message + \" (생성본: \" + text.substring(0, 100) + \"...)\";\n    }\n  }\n} else {\n  feedback = \"JSON 형식의 응답을 찾을 수 없습니다.\";\n}\n\nlet scriptDraft = \"\";\ntry {\n  // In n8n, the input to this parser is from qa-node, which runs after 2-1\n  scriptDraft = $('2-1. 콘텐츠 기획 및 가대본 제작').first().json.text || \"\";\n} catch (e) {\n  scriptDraft = \"\";\n}\n\nlet summary = scriptDraft;\nsummary = summary.replace(/자동 선정 주제:.*\\n?/, \"\").trim();\nif (summary.length > 800) {\n  summary = summary.substring(0, 800) + \"\\n... (이하 생략)\";\n}\n\n// Get row_id from previous node or generate new one if not retry run\nlet row_id = \"\";\ntry {\n  row_id = $('Prepare QA Input').first().json.row_id || \"\";\n} catch(err) {}\nif (!row_id) {\n  row_id = \"CNT_\" + new Date().toISOString().replace(/[-:T.Z]/g, \"\") + \"_\" + Math.floor(Math.random() * 1000);\n}\n\nlet topic = \"\";\ntry {\n  topic = $('Format Retry Input').first().json.topic || \"\";\n} catch(err) {}\nif (!topic) {\n  try {\n    let rText = $('2. 자동 주제 선정 & 자료 조사').first().json.text || \"\";\n    const topicMatch = rText.match(/자동 선정 주제:\\s*(.*)/) || rText.match(/주제:\\s*(.*)/) || rText.match(/###\\s*(.*)/);\n    topic = topicMatch ? topicMatch[1].trim() : \"2026년 AI 트렌드\";\n  } catch(err) {\n    topic = \"2026년 AI 트렌드\";\n  }\n}\n\n// Detect if this execution has Format Retry Input node in its path safely\nlet is_retry = false;\ntry {\n  if ($('Format Retry Input').first().json !== undefined) {\n    is_retry = true;\n  }\n} catch (e) {\n  is_retry = false;\n}\n\nreturn {\n  pass,\n  score,\n  feedback,\n  topic,\n  script_draft: scriptDraft,\n  script_summary: summary,\n  row_id,\n  is_retry\n};"
        },
        id: "json-parser-node",
        name: "4. AI 검수 결과 파싱",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [1700, 300]
      },
      {
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              type: "string",
              value1: "",
              value2: ""
            },
            conditions: [
              {
                leftValue: "={{ $json.pass }}",
                rightValue: "",
                operator: {
                  type: "boolean",
                  operation: "true",
                  singleValue: true
                }
              }
            ],
            combinator: "and"
          },
          options: {}
        },
        id: "if-node",
        name: "5. 검수 통과 여부 확인",
        type: "n8n-nodes-base.if",
        typeVersion: 2.2,
        position: [1900, 300]
      },
      {
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              type: "string",
              value1: "",
              value2: ""
            },
            conditions: [
              {
                leftValue: "={{ $json.is_retry }}",
                rightValue: "",
                operator: {
                  type: "boolean",
                  operation: "true",
                  singleValue: true
                }
              }
            ],
            combinator: "and"
          },
          options: {}
        },
        id: "is-retry-pass",
        name: "Is Retry (Pass)?",
        type: "n8n-nodes-base.if",
        typeVersion: 2.2,
        position: [2100, 200]
      },
      {
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              type: "string",
              value1: "",
              value2: ""
            },
            conditions: [
              {
                leftValue: "={{ $json.is_retry }}",
                rightValue: "",
                operator: {
                  type: "boolean",
                  operation: "true",
                  singleValue: true
                }
              }
            ],
            combinator: "and"
          },
          options: {}
        },
        id: "is-retry-fail",
        name: "Is Retry (Fail)?",
        type: "n8n-nodes-base.if",
        typeVersion: 2.2,
        position: [2100, 400]
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
            value: "gid=0",
            mode: "list",
            cachedResultName: "시트1",
            cachedResultUrl: "https://docs.google.com/spreadsheets/d/1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0/edit#gid=0"
          },
          columns: {
            mappingMode: "defineBelow",
            value: {
              ID: "={{ $json.row_id }}",
              Topic_Raw: "={{ $json.topic }}",
              Research_Data: "= [가대본]\n{{ $json.script_draft }}\n\n---\n[자료조사 원본]\n{{ $('Prepare QA Input').first().json.research_text }}",
              Confirm_1차_Fe: "=AI 검수 통과 (점수: {{ $json.score }}/10)",
              Status: "1차승인대기"
            },
            schema: []
          },
          options: {}
        },
        id: "google-sheets-save-node",
        name: "6. 구글 시트 저장",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [2300, 150],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        }
      },
      {
        parameters: {
          chatId: telegramChatId,
          text: "=📢 <b>[1차 콘텐츠 가대본 기획 완료]</b>\n\n📌 <b>주제</b>: {{ $('4. AI 검수 결과 파싱').first().json.topic.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') }}\n⭐ <b>AI 검수 점수</b>: {{ $('4. AI 검수 결과 파싱').first().json.score }}/10점\n\n📝 <b>기획 및 가대본 요약</b>:\n{{ $('4. AI 검수 결과 파싱').first().json.script_summary.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') }}\n\n위 가대본으로 다음 단계(최종 대본 및 영상 리소스 제작)를 진행할까요?",
          replyMarkup: "inlineKeyboard",
          inlineKeyboard: {
            rows: [
              {
                buttons: [
                  {
                    text: "👍 1차 승인",
                    additionalFields: {
                      callback_data: "={{ '=approve_1_' + $('4. AI 검수 결과 파싱').first().json.row_id }}"
                    }
                  },
                  {
                    text: "👎 1차 거절",
                    additionalFields: {
                      callback_data: "={{ '=reject_1_' + $('4. AI 검수 결과 파싱').first().json.row_id }}"
                    }
                  }
                ]
              },
              {
                buttons: [
                  {
                    text: "🔄 피드백 반영 재시도",
                    additionalFields: {
                      callback_data: "={{ '=retry_1_' + $('4. AI 검수 결과 파싱').first().json.row_id }}"
                    }
                  }
                ]
              }
            ]
          },
          additionalFields: {
            appendAttribution: false,
            parseMode: "HTML"
          }
        },
        id: "telegram-approval-node",
        name: "7. 텔레그램 1차 승인 요청",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [2500, 150],
        credentials: {
          telegramApi: {
            id: "UpgU76dwpjon6Ztm",
            name: "Telegram Bot API"
          }
        }
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
            value: "gid=0",
            mode: "list",
            cachedResultName: "시트1",
            cachedResultUrl: "https://docs.google.com/spreadsheets/d/1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0/edit#gid=0"
          },
          columns: {
            mappingMode: "defineBelow",
            value: {
              ID: "={{ $json.row_id }}",
              Topic_Raw: "={{ $json.topic }}",
              Research_Data: "= [가대본]\n{{ $json.script_draft }}\n\n---\n[자료조사 원본]\n{{ $('Prepare QA Input').first().json.research_text }}",
              Confirm_1차_Fe: "={{ $json.feedback }}",
              Status: "1차검수탈락"
            },
            schema: []
          },
          options: {}
        },
        id: "google-sheets-save-fail-node",
        name: "6-1. 구글 시트 저장 (실패 건)",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [2300, 480],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        }
      },
      {
        parameters: {
          chatId: telegramChatId,
          text: "=⚠️ <b>[가대본 기획 및 AI 검수 최종 실패]</b>\n\n🤖 AI 검수를 통과하지 못했습니다.\n\n📌 <b>주제</b>: {{ $('4. AI 검수 결과 파싱').first().json.topic.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') }}\n⭐ <b>최종 AI 검수 점수</b>: {{ $('4. AI 검수 결과 파싱').first().json.score }}/10점\n❌ <b>최종 반려 피드백</b>:\n{{ $('4. AI 검수 결과 파싱').first().json.feedback.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') }}\n\n피드백을 반영하여 대본을 다시 작성하시겠습니까?",
          replyMarkup: "inlineKeyboard",
          inlineKeyboard: {
            rows: [
              {
                buttons: [
                  {
                    text: "🔄 피드백 반영 재시도",
                    additionalFields: {
                      callback_data: "={{ '=retry_1_' + $('4. AI 검수 결과 파싱').first().json.row_id }}"
                    }
                  },
                  {
                    text: "👎 최종 반려",
                    additionalFields: {
                      callback_data: "={{ '=reject_1_' + $('4. AI 검수 결과 파싱').first().json.row_id }}"
                    }
                  }
                ]
              }
            ]
          },
          additionalFields: {
            appendAttribution: false,
            parseMode: "HTML"
          }
        },
        id: "telegram-failure-notification",
        name: "Telegram Failure Notification",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [2500, 480],
        credentials: {
          telegramApi: {
            id: "UpgU76dwpjon6Ztm",
            name: "Telegram Bot API"
          }
        }
      },

      // ==========================================
      // FLOW 2: Telegram Callback Handler & Loopback (Y: 850)
      // ==========================================
      {
        parameters: {
          updates: [
            "callback_query"
          ],
          additionalFields: {}
        },
        id: "telegram-trigger",
        name: "Telegram Trigger",
        type: "n8n-nodes-base.telegramTrigger",
        typeVersion: 1.1,
        position: [100, 850],
        credentials: {
          telegramApi: {
            id: "UpgU76dwpjon6Ztm",
            name: "Telegram Bot API"
          }
        }
      },
      {
        parameters: {
          jsCode: "const query = $json.callback_query || {};\nconst data = query.data || \"\";\nconst parts = data.replace(/^=/, \"\").split(\"_\"); // Remove leading '=' if present\nconst action = parts[0]; // \"approve\", \"reject\", \"retry\"\nconst row_id = parts.slice(2).join(\"_\"); // \"CNT_123456\"\nconst message_id = query.message ? query.message.message_id : null;\nconst callback_query_id = query.id;\n\nreturn {\n  action,\n  row_id,\n  message_id,\n  callback_query_id\n};"
        },
        id: "parse-callback",
        name: "Parse Callback",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [300, 850]
      },
      {
        parameters: {
          conditions: {
            options: {
              caseSensitive: true,
              leftValue: "",
              type: "string",
              value1: "",
              value2: ""
            },
            conditions: [
              {
                leftValue: "={{ $json.action }}",
                rightValue: "retry",
                operator: {
                  type: "string",
                  operation: "equals",
                  singleValue: true
                }
              }
            ],
            combinator: "and"
          },
          options: {}
        },
        id: "if-retry",
        name: "If Retry Action",
        type: "n8n-nodes-base.if",
        typeVersion: 2.2,
        position: [500, 850]
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
            value: "gid=0",
            mode: "list",
            cachedResultName: "시트1",
            cachedResultUrl: "https://docs.google.com/spreadsheets/d/1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0/edit#gid=0"
          },
          updateKey: "ID",
          updateKeyValue: "={{ $json.row_id }}",
          columns: {
            mappingMode: "defineBelow",
            value: {
              Status: "={{ $('Parse Callback').first().json.action === 'approve' ? '1차승인완료' : '1차거절' }}"
            },
            schema: []
          },
          options: {}
        },
        id: "sheets-update-status",
        name: "Google Sheets - Update Status",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [700, 720],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        }
      },
      {
        parameters: {
          resource: "message",
          operation: "editMessageText",
          chatId: telegramChatId,
          messageId: "={{ $('Parse Callback').first().json.message_id }}",
          text: "= {{ $('Parse Callback').first().json.action === 'approve' ? '✅ <b>[1차 승인 완료]</b>' : '❌ <b>[1차 반려 완료]</b>' }}\n\n📌 <b>주제</b>: {{ $json.Topic_Raw.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') }}\n- <b>상태</b>: {{ $('Parse Callback').first().json.action === 'approve' ? '1차 승인 완료 (2차 최종 제작 단계 대기)' : '최종 반려 및 중단 처리됨' }}",
          additionalFields: {
            appendAttribution: false,
            parseMode: "HTML"
          }
        },
        id: "telegram-clear-buttons",
        name: "Telegram - Clear Buttons",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [900, 720],
        credentials: {
          telegramApi: {
            id: "UpgU76dwpjon6Ztm",
            name: "Telegram Bot API"
          }
        }
      },
      {
        parameters: {
          documentId: {
            __rl: true,
            value: "1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0",
            mode: "id"
          },
          sheetName: {
            __rl: true,
            value: "gid=0",
            mode: "list",
            cachedResultName: "시트1",
            cachedResultUrl: "https://docs.google.com/spreadsheets/d/1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0/edit#gid=0"
          },
          options: {}
        },
        id: "sheets-read-retry",
        name: "Google Sheets - Read Retry Row",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [700, 950],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        }
      },
      {
        parameters: {
          jsCode: "const items = $input.all();\nconst row_id = $('Parse Callback').first().json.row_id;\nconst row = items.find(item => item.json.ID === row_id);\nif (!row) {\n  throw new Error(`Row not found for ID: ${row_id}`);\n}\nreturn row.json;"
        },
        id: "find-retry-row",
        name: "Find Retry Row",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [900, 950]
      },
      {
        parameters: {
          resource: "message",
          operation: "editMessageText",
          chatId: telegramChatId,
          messageId: "={{ $('Parse Callback').first().json.message_id }}",
          text: "=🔄 <b>[피드백 반영 재작성 시작]</b>\n\nAI가 이전 반려 피드백을 수용하여 대본을 새로 다시 작성하고 있습니다. 잠시만 기다려주세요...\n(ID: {{ $json.ID }})",
          additionalFields: {
            appendAttribution: false,
            parseMode: "HTML"
          }
        },
        id: "telegram-notify-retry-start",
        name: "Telegram - Notify Retry Start",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [1100, 850],
        credentials: {
          telegramApi: {
            id: "UpgU76dwpjon6Ztm",
            name: "Telegram Bot API"
          }
        }
      },
      {
        parameters: {
          jsCode: "return {\n  text: $input.item.json.Research_Data, // treat previous script as the base text\n  feedback: $input.item.json.Confirm_1차_Fe, // pass the feedback\n  row_id: $input.item.json.ID,\n  topic: $input.item.json.Topic_Raw\n};"
        },
        id: "Format Retry Input",
        name: "Format Retry Input",
        type: "n8n-nodes-base.code",
        typeVersion: 2,
        position: [1100, 1050]
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
            value: "gid=0",
            mode: "list",
            cachedResultName: "시트1",
            cachedResultUrl: "https://docs.google.com/spreadsheets/d/1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0/edit#gid=0"
          },
          updateKey: "ID",
          updateKeyValue: "={{ $('4. AI 검수 결과 파싱').first().json.row_id }}",
          columns: {
            mappingMode: "defineBelow",
            value: {
              Research_Data: "= [가대본]\n{{ $json.script_draft }}\n\n---\n[자료조사 원본]\n{{ $('Prepare QA Input').first().json.research_text }}",
              Confirm_1차_Fe: "={{ $json.pass ? '재시도 통과 (점수: ' + $json.score + '/10)' : $json.feedback }}",
              Status: "={{ $json.pass ? '1차승인대기' : '1차검수탈락' }}"
            },
            schema: []
          },
          options: {}
        },
        id: "sheets-retry-save",
        name: "Google Sheets - Retry Save",
        type: "n8n-nodes-base.googleSheets",
        typeVersion: 4,
        position: [2300, 300],
        credentials: {
          googleSheetsOAuth2Api: {
            id: "kYYPtfXi2R21Raso",
            name: "Google Sheets account"
          }
        }
      },
      {
        parameters: {
          chatId: telegramChatId,
          text: "= {{ $('4. AI 검수 결과 파싱').first().json.pass ? '📢 <b>[재재작성 완료 - 1차 검수 통과]</b>' : '⚠️ <b>[재재작성 완료 - AI 검수 최종 실패]</b>' }}\n\n📌 <b>주제</b>: {{ $('4. AI 검수 결과 파싱').first().json.topic.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') }}\n⭐ <b>AI 검수 점수</b>: {{ $('4. AI 검수 결과 파싱').first().json.score }}/10점\n{{ $('4. AI 검수 결과 파싱').first().json.pass ? '' : '❌ <b>최종 반려 피드백</b>:\\n' + $('4. AI 검수 결과 파싱').first().json.feedback.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') }}\n\n{{ $('4. AI 검수 결과 파싱').first().json.pass ? '📝 <b>기획 및 가대본 요약</b>:\\n' + $('4. AI 검수 결과 파싱').first().json.script_summary.split('&').join('&amp;').split('<').join('&lt;').split('>').join('&gt;') + '\\n\\n위 가대본으로 다음 단계를 진행할까요?' : '피드백을 반영하여 다시 대본을 작성하시겠습니까?' }}",
          replyMarkup: "inlineKeyboard",
          inlineKeyboard: "={{ { rows: $('4. AI 검수 결과 파싱').first().json.pass ? [ { buttons: [ { text: '👍 1차 승인', additionalFields: { callback_data: '=approve_1_' + $('4. AI 검수 결과 파싱').first().json.row_id } }, { text: '👎 1차 거절', additionalFields: { callback_data: '=reject_1_' + $('4. AI 검수 결과 파싱').first().json.row_id } } ] }, { buttons: [ { text: '🔄 피드백 반영 재시도', additionalFields: { callback_data: '=retry_1_' + $('4. AI 검수 결과 파싱').first().json.row_id } } ] } ] : [ { buttons: [ { text: '🔄 피드백 반영 재시도', additionalFields: { callback_data: '=retry_1_' + $('4. AI 검수 결과 파싱').first().json.row_id } }, { text: '👎 최종 반려', additionalFields: { callback_data: '=reject_1_' + $('4. AI 검수 결과 파싱').first().json.row_id } } ] } ] } }}",
          additionalFields: {
            appendAttribution: false,
            parseMode: "HTML"
          }
        },
        id: "telegram-retry-notify",
        name: "Telegram - Retry Notify",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [2500, 300],
        credentials: {
          telegramApi: {
            id: "UpgU76dwpjon6Ztm",
            name: "Telegram Bot API"
          }
        }
      },
      {
        parameters: {
          resource: "callback",
          operation: "answerQuery",
          callbackQueryId: "={{ $('Parse Callback').first().json.callback_query_id }}",
          options: {}
        },
        id: "telegram-answer-callback",
        name: "Telegram - Answer Callback",
        type: "n8n-nodes-base.telegram",
        typeVersion: 1.2,
        position: [700, 1150],
        credentials: {
          telegramApi: {
            id: "UpgU76dwpjon6Ztm",
            name: "Telegram Bot API"
          }
        }
      }
    ],
    connections: {
      // CONNECTIONS FOR FLOW 1
      "Manual Trigger": {
        main: [
          [
            {
              node: "0. 기존 주제 목록 조회",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "0. 기존 주제 목록 조회": {
        main: [
          [
            {
              node: "0-1. 기존 주제 병합",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "0-1. 기존 주제 병합": {
        main: [
          [
            {
              node: "1. 실시간 트렌드 검색",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "1. 실시간 트렌드 검색": {
        main: [
          [
            {
              node: "2. 자동 주제 선정 & 자료 조사",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "2. 자동 주제 선정 & 자료 조사": {
        main: [
          [
            {
              node: "2-1. 콘텐츠 기획 및 가대본 제작",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "2-1. 콘텐츠 기획 및 가대본 제작": {
        main: [
          [
            {
              node: "Prepare QA Input",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Prepare QA Input": {
        main: [
          [
            {
              node: "3. AI 1차 검수",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "3. AI 1차 검수": {
        main: [
          [
            {
              node: "4. AI 검수 결과 파싱",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "4. AI 검수 결과 파싱": {
        main: [
          [
            {
              node: "5. 검수 통과 여부 확인",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "5. 검수 통과 여부 확인": {
        main: [
          [
            {
              node: "Is Retry (Pass)?",
              type: "main",
              index: 0
            }
          ],
          [
            {
              node: "Is Retry (Fail)?",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Is Retry (Pass)?": {
        main: [
          [
            {
              node: "Google Sheets - Retry Save",
              type: "main",
              index: 0
            }
          ],
          [
            {
              node: "6. 구글 시트 저장",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "6. 구글 시트 저장": {
        main: [
          [
            {
              node: "7. 텔레그램 1차 승인 요청",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Is Retry (Fail)?": {
        main: [
          [
            {
              node: "Google Sheets - Retry Save",
              type: "main",
              index: 0
            }
          ],
          [
            {
              node: "6-1. 구글 시트 저장 (실패 건)",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "6-1. 구글 시트 저장 (실패 건)": {
        main: [
          [
            {
              node: "Telegram Failure Notification",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Google Sheets - Retry Save": {
        main: [
          [
            {
              node: "Telegram - Retry Notify",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Gemini Chat Model - Research": {
        ai_languageModel: [
          [
            {
              node: "2. 자동 주제 선정 & 자료 조사",
              type: "ai_languageModel",
              index: 0
            }
          ]
        ]
      },
      "Gemini Chat Model - Planning": {
        ai_languageModel: [
          [
            {
              node: "2-1. 콘텐츠 기획 및 가대본 제작",
              type: "ai_languageModel",
              index: 0
            }
          ]
        ]
      },
      "Gemini Chat Model - QA": {
        ai_languageModel: [
          [
            {
              node: "3. AI 1차 검수",
              type: "ai_languageModel",
              index: 0
            }
          ]
        ]
      },

      // CONNECTIONS FOR FLOW 2
      "Telegram Trigger": {
        main: [
          [
            {
              node: "Parse Callback",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Parse Callback": {
        main: [
          [
            {
              node: "If Retry Action",
              type: "main",
              index: 0
            },
            {
              node: "Telegram - Answer Callback",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "If Retry Action": {
        main: [
          [
            {
              node: "Google Sheets - Read Retry Row",
              type: "main",
              index: 0
            }
          ],
          [
            {
              node: "Google Sheets - Update Status",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Google Sheets - Update Status": {
        main: [
          [
            {
              node: "Telegram - Clear Buttons",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Google Sheets - Read Retry Row": {
        main: [
          [
            {
              node: "Find Retry Row",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Find Retry Row": {
        main: [
          [
            {
              node: "Telegram - Notify Retry Start",
              type: "main",
              index: 0
            },
            {
              node: "Format Retry Input",
              type: "main",
              index: 0
            }
          ]
        ]
      },
      "Format Retry Input": {
        main: [
          [
            {
              node: "2-1. 콘텐츠 기획 및 가대본 제작",
              type: "main",
              index: 0
            }
          ]
        ]
      }
    },
    settings: {}
  };

  try {
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
    console.log(`✅ Combined Workflow processed successfully (ID: ${data.id})`);
    console.log(`🔗 Link to open in n8n: ${workflowUrl}`);

    // Activate the combined workflow since it contains the Telegram Trigger!
    console.log("⚡ Activating Combined Workflow...");
    const activateResponse = await fetch(`${baseUrl}/api/v1/workflows/${data.id}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "X-N8N-API-KEY": apiKey
      },
      body: JSON.stringify({
        active: true
      })
    });
    if (activateResponse.ok) {
      console.log("✅ Combined Workflow activated successfully!");
    } else {
      console.warn("⚠️ Failed to activate workflow automatically. Please activate it manually in n8n UI.");
    }
  } catch (error) {
    console.error("❌ Failed to process workflow:", error.message);
    process.exit(1);
  }
}

createWorkflow();
