#!/bin/bash
set -e
BASE="http://localhost:8000/api/v1"
PASS=0
FAIL=0

check() {
  local label=$1 result=$2 expected=$3
  if echo "$result" | grep -q "$expected"; then
    echo "PASS: $label"
    PASS=$((PASS + 1))
  else
    echo "FAIL: $label — got: $result"
    FAIL=$((FAIL + 1))
  fi
}

# Login as admin
TOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@company.com","password":"Admin123!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
check "admin login" "$TOKEN" "eyJ"

# Auth me
R=$(curl -sf "$BASE/auth/me" -H "Authorization: Bearer $TOKEN")
check "auth/me" "$R" "admin@company.com"

# Query with real answer (docs are seeded)
R=$(curl -sf -X POST "$BASE/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"query":"what is our deployment process?"}')
check "query answer non-empty" "$R" "answer"
check "query has citations" "$R" "source_url"

# RBAC: junior_dev queries HR doc — should get low confidence
JTOKEN=$(curl -sf -X POST "$BASE/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"jamie.junior@company.com","password":"Demo1234!"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
R=$(curl -sf -X POST "$BASE/query" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $JTOKEN" \
  -d '{"query":"what is the PTO policy?"}')
check "RBAC junior no HR chunks" "$R" "is_low_confidence"

# Admin endpoints
R=$(curl -sf "$BASE/admin/sources" -H "Authorization: Bearer $TOKEN")
check "admin sources" "$R" "mock"

R=$(curl -sf "$BASE/admin/users" -H "Authorization: Bearer $TOKEN")
check "admin users count" "$R" "admin@company.com"

R=$(curl -sf "$BASE/admin/audit" -H "Authorization: Bearer $TOKEN")
check "admin audit log" "$R" "action"

echo ""
echo "Results: $PASS passed, $FAIL failed"
[ "$FAIL" -eq 0 ] || exit 1
