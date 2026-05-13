# Smoke Test: Expand Automation API

Target:

```bash
export STRIDE_BASE_URL="https://stride-os.mengpeng.tech"
export STRIDE_TOKEN="replace-with-api-token"
```

## Auth

```bash
curl -sS "$STRIDE_BASE_URL/api/v1/me" \
  -H "Authorization: Bearer $STRIDE_TOKEN"
```

## Task

```bash
TASK_ID=$(
  curl -sS "$STRIDE_BASE_URL/api/v1/tasks" \
    -H "Authorization: Bearer $STRIDE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"title":"Smoke task from API","priority":"P2","dueDate":"2026-05-13"}' \
  | jq -r '.id'
)

curl -sS "$STRIDE_BASE_URL/api/v1/tasks?source=all" \
  -H "Authorization: Bearer $STRIDE_TOKEN"

curl -sS "$STRIDE_BASE_URL/api/v1/tasks/reminders?today=2026-05-13&to=2026-05-20" \
  -H "Authorization: Bearer $STRIDE_TOKEN"

curl -sS -X POST "$STRIDE_BASE_URL/api/v1/tasks/$TASK_ID/archive" \
  -H "Authorization: Bearer $STRIDE_TOKEN"
```

## OKR

```bash
PERIOD_ID=$(
  curl -sS "$STRIDE_BASE_URL/api/v1/okr/periods" \
    -H "Authorization: Bearer $STRIDE_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"Smoke Period","type":"custom","startDate":"2026-05-01","endDate":"2026-05-31","status":"active"}' \
  | jq -r '.id'
)

OBJECTIVE_ID=$(
  curl -sS "$STRIDE_BASE_URL/api/v1/okr/objectives" \
    -H "Authorization: Bearer $STRIDE_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"periodId\":\"$PERIOD_ID\",\"title\":\"Smoke Objective\"}" \
  | jq -r '.id'
)

KR_ID=$(
  curl -sS "$STRIDE_BASE_URL/api/v1/okr/key-results" \
    -H "Authorization: Bearer $STRIDE_TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"objectiveId\":\"$OBJECTIVE_ID\",\"title\":\"Smoke KR\",\"type\":\"numeric\",\"targetValue\":100,\"currentValue\":10,\"confidence\":\"medium\"}" \
  | jq -r '.id'
)

curl -sS "$STRIDE_BASE_URL/api/v1/okr/key-results/$KR_ID/check-ins" \
  -H "Authorization: Bearer $STRIDE_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"progressValue":15,"confidence":"medium","summary":"Smoke check-in"}'
```

## Review Context

```bash
curl -sS "$STRIDE_BASE_URL/api/v1/reviews/context" \
  -H "Authorization: Bearer $STRIDE_TOKEN"

curl -sS "$STRIDE_BASE_URL/api/v1/reviews/context?type=weekly&start=2026-05-11&end=2026-05-17" \
  -H "Authorization: Bearer $STRIDE_TOKEN"

curl -sS "$STRIDE_BASE_URL/api/v1/reviews/context?type=monthly&start=2026-05-01&end=2026-05-31" \
  -H "Authorization: Bearer $STRIDE_TOKEN"
```
