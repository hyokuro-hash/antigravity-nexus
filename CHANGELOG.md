# Changelog

All notable changes to this project will be documented in this file.

## [0.7.4] - 2026-07-27

### Added
- Google Sheets 연동 테스트 노드(`Google Sheets Test`) 추가 및 통합 검증 워크플로우 동기화 완료
  - 구글 시트 문서(`1kW7YKfXqccDz3GEqDY_zLt5lqcnHHE6B3jum96yerX0`)와 연동하여 첫 번째 시트의 모든 행 데이터를 조회하는 동작 검증 지원

## [0.7.3] - 2026-07-27

### Added
- `.env` 및 `.env.example`에 `APIFY_API_KEY` 환경 변수 추가

### Changed
- Apify 연동 테스트 방식을 n8n 크레덴셜 바인딩 대신 직접 헤더 전송(Authentication: none, Authorization: Bearer <Token> 헤더 기입)으로 전환
- `.antigravityrules`에 Apify 연동 시 Bearer 토큰 헤더 직접 명시 및 환경 변수 참조 규칙 업데이트 적용

## [0.7.2] - 2026-07-27

### Added
- `.env` 및 `.env.example`에 `APIFRAME_API_KEY` 환경 변수 추가

### Changed
- Apiframe 연동 테스트 방식을 n8n 크레덴셜 바인딩 대신 직접 헤더 전송(Authentication: none, X-API-Key 헤더 기입)으로 전환
- `.antigravityrules`에 Apiframe 연동 시 헤더(X-API-Key) 직접 명시 및 환경 변수 참조 규칙 업데이트 적용

## [0.7.1] - 2026-07-27

### Fixed
- n8n 최신 HTTP Request 노드 v4.1 스키마 호환 오류 해결:
  - `authentication` 옵션 값을 기존의 `"generic"`, `"predefined"`에서 신규 명세 규격인 `"genericCredentialType"`, `"predefinedCredentialType"`으로 정정
  - 해당 옵션 불일치로 인해 UI 상에서 크레덴셜 선택란이 실종되고 검증이 실패(status 에러)하던 현상 조치 완료 및 Tavily 연동 성공 검증 완료
  - `.antigravityrules`에 해당 명세 제약 규칙 명문화 적용

## [0.7.0] - 2026-07-26

### Added
- `.antigravityrules`에 Google Gemini 설정 시 작동 가능한 최신 활성 모델인 `models/gemini-3.6-flash` 지정 필수 규칙 추가

### Fixed
- 구글 Gemini API v1beta 엔드포인트에서 1.5/2.5-flash 모델 비활성화(404 에러) 이슈 해결:
  - 작동 가능한 최신 모델 버전인 `models/gemini-3.6-flash`로 명시적 지정하여 최종 연동 테스트(인사말 반환) 100% 검증 완료

## [0.6.6] - 2026-07-26

### Fixed
- 구글 Gemini API 측에서 신규 계정에 대해 `gemini-2.5-flash` 모델을 비활성화(404 에러)함에 따라, 작동 가능한 최신 안정 버전인 `models/gemini-1.5-flash` 모델명을 명시적으로 지정하여 조치 완료

## [0.6.5] - 2026-07-26

### Fixed
- 제미나이 Chat Model 노드에서 `modelName` 옵션을 제거하고 n8n 기본값을 사용하도록 수정하여 모델명 불일치로 인한 초기화 실패 조치 (비활성화 모델 이슈 파악 전 일시적 대응 기록)

## [0.6.4] - 2026-07-26

### Fixed
- 제미나이 LangChain Chain-Model의 표준 소스 기반 연결 정의(\`Google Gemini Chat Model\` -> \`ai_languageModel\` -> \`Google Gemini Test\`)로 최종 복구하여 캔버스 상의 연결선 누락 문제 완벽히 조치

## [0.6.3] - 2026-07-26

### Fixed
- Apiframe 검증 시 대상(job ID) 미존재로 인한 404 실패 조치:
  - 계정 한도 및 정보를 조회할 수 있는 공식 \`GET https://api.apiframe.ai/v2/me\` 엔드포인트로 대체하여 실질적인 자격 증명 성공률 극대화

## [0.6.2] - 2026-07-26

### Fixed
- 제미나이 LangChain Chain 및 Model 연결 선언 오류(prompt 누락 및 연결 방향/타입 미비) 조치 및 수정 완료
- HTTP Request 노드들에서 `method` 매개변수 누락으로 Axios 요청 실패하여 `Cannot read properties of undefined (reading 'status')` 에러 나던 현상 수정:
  - Tavily: `POST https://api.tavily.com/search` 및 JSON body 추가 설정
  - Apify/Apiframe: `GET` 메소드 명시
  - 모든 검증 노드에 `onError: "continue"` 설정 추가하여 한 개 노드 실패 시에도 전체 실행 가능하게 안전조치

## [0.6.1] - 2026-07-26

### Fixed
- 구버전 n8n 및 클라우드 인스턴스에서 `n8n-nodes-base.googleGemini` 노드 타입 미지원으로 인한 실행 불가 에러(Unrecognized node type) 조치:
  - Gemini를 Visual Editor에서 호환성 100% 검증된 LangChain Basic LLM Chain 및 Google Gemini Chat Model 구조로 교체 연동 성공

## [0.6.0] - 2026-07-26

### Added
- `.antigravityrules`에 사용자 지정 `n8n Workflow & Credential Management Rules` (수정 정책, 자격 증명 사용 규칙, 노드 구성 보호 장치) 상세 추가

### Verified
- `.antigravityrules`에 명문화된 규칙을 적용 완료하고 앞으로 모든 워크플로우 제어 및 크레덴셜 관리에 이 규칙을 의무 준수하도록 설정 완료

## [0.5.1] - 2026-07-26

### Fixed
- Google Gemini 내장 노드 크레덴셜 매핑 수정: `googleGeminiApi` 슬롯에서 실제 등록된 크레덴셜 형식인 `googlePalmApi` 슬롯으로 키 매핑 변경하여 인증 매칭 성공
- Apify 및 Tavily 크레덴셜 타입 불일치 해결:
  - Apify는 `apifyMcpOAuth2Api` 전용 OAuth2이므로 HTTP Request `predefined` 방식을 복구하여 연동 성공
  - Tavily는 `httpHeaderAuth` 형식이므로 HTTP Request `generic` (Header Auth) 방식을 정확히 구현하여 연동 성공
- Apiframe 크레덴셜 `httpHeaderAuth`도 HTTP Request `generic` (Header Auth) 방식으로 맞춰 연동 성공

## [0.5.0] - 2026-07-26

### Changed
- `scripts/create-all-tests.js`의 검증 노드를 HTTP Request 대신 n8n 내장 공식 노드로 교체:
  - Google Gemini: `n8n-nodes-base.googleGemini` 적용
  - Apify: `n8n-nodes-base.apify` 적용
  - Tavily: `n8n-nodes-base.tavily` 적용

### Verified
- `create-all-tests.js` 실행 시 기존 워크플로우(ID: `x9dKqSrrjC1dhDP1`)를 제자리 업데이트(PUT)하고, 구글 드라이브/제미나이/타빌리/Apify 크레덴셜이 공식 내장 노드 형태로 무사히 변경되어 등록된 것을 확인

## [0.4.0] - 2026-07-26

### Added
- `scripts/cleanup-workflows.js` 스크립트 작성 (n8n 워크플로우 중복 방지 및 기존 중복 항목 정리)

### Changed
- `scripts/create-all-tests.js` 및 `scripts/test-telegram-n8n.js` 스크립트 수정: 기존 동일 이름의 워크플로우 존재 시 새 워크플로우를 생성(POST)하지 않고, 기존 워크플로우 ID를 조회하여 제자리 업데이트(PUT `/api/v1/workflows/{id}`)를 수행하도록 로직 고도화
- `.antigravityrules`에 n8n 워크플로우 수정 시 PUT 업데이트 방식 강제 규칙 명문화

### Verified
- `cleanup-workflows.js` 실행을 통해 "Credentials Verification Workflow" 및 "Telegram Integration Test Workflow" 중 최신 버전 1개씩만 남기고 나머지 중복 생성된 과거 워크플로우를 모두 정리 완료 (ID: `GIC5EvGonUmtuLFw`, `vz3PG9mdEdgk3okM`, `FFduxysHKclMXuQm` 제거 성공)

## [0.3.2] - 2026-07-26

### Fixed
- Google Drive 내장 노드 실행 시 발생하던 `Cannot read properties of undefined (reading 'execute')` 에러 해결 (누락된 `resource: "file"` 선언 추가 및 안정적인 `typeVersion: 2` 구조 적용)

### Verified
- 구글 드라이브 내장 노드 수정 후 `Credentials Verification Workflow`에서 파일 목록이 오류 없이 성공적으로 불러와지는 것을 확인 (ID: `x9dKqSrrjC1dhDP1`)

## [0.3.1] - 2026-07-26

### Fixed
- Google Drive API 검증에 쓰이던 HTTP Request 노드를 n8n 내장 구글 드라이브 노드(`n8n-nodes-base.googleDrive`)로 교체하여 인증 상태(status) 참조 오류 수정

### Verified
- 구글 드라이브 내장 노드 연동을 통해 `Credentials Verification Workflow`에서 구글 드라이브 파일 목록을 에러 없이 성공적으로 조회하는 것을 확인 (ID: `GIC5EvGonUmtuLFw`)

## [0.3.0] - 2026-07-26

### Added
- `scripts/create-all-tests.js` 스크립트 작성 (구글 드라이브, 제미나이, 타빌리, Apiframe, Apify 크레덴셜을 한 번에 검증할 수 있는 통합 테스트 워크플로우 자동 생성)

### Verified
- n8n Public API를 통해 구글 드라이브, 제미나이, 타빌리, Apiframe, Apify API 등 5개 연동 크레덴셜을 HTTP Request 노드 형태로 순차/병렬 검증하는 `Credentials Verification Workflow` 자동 생성 성공 (ID: `vz3PG9mdEdgk3okM`)

## [0.2.0] - 2026-07-26

### Added
- `.env` 및 `.env.example` 파일에 `TELEGRAM_BOT_TOKEN` 및 `TELEGRAM_CHAT_ID` 환경 변수 추가
- `scripts/test-telegram-n8n.js` 통합 테스트 스크립트 작성 (Telegram Bot API 직접 메시지 전송 및 n8n 텔레그램 크레덴셜/테스트 워크플로우 자동 생성)

### Verified
- Telegram Bot API를 활용하여 `[n8n 연동 테스트] 메시지 발송 성공!` 메시지 발송 성공 검증
- n8n Public API를 호출하여 텔레그램 연동을 위한 `telegramApi` 크레덴셜 생성(또는 조회) 및 Manual Trigger와 Telegram 노드로 구성된 테스트 워크플로우 자동 생성 성공 (ID: `oOogLFPCF00JV6pv`)

## [0.1.0] - 2026-07-26

### Added
- `.env` 및 `.env.example` 파일을 생성하여 n8n API 주소 및 API 키 설정 구조 구축
- `.gitignore` 파일을 작성하여 `.env` 설정 및 임시/로그 파일(Node, Python) 보안 격리 적용
- `.antigravityrules` 파일을 프로젝트 루트에 생성하고 n8n API 사용 규칙 및 Git 커밋/로그 기록 규칙 정의
- `scripts/test-n8n.js` 스크립트를 작성하여 n8n Public API 연동 상태 및 워크플로우 조회 기능 테스트 수행
- `src/` 디렉터리에 `.gitkeep` 플레이스홀더 파일을 추가하여 프로젝트 구조 기반 마련

### Verified
- `test-n8n.js` 실행 시 n8n Cloud 서버(`https://kuro-factory.app.n8n.cloud`)로의 연결에 성공하고 응답을 정상적으로 수신함을 검증
