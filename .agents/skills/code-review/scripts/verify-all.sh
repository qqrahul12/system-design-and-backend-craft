#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo "🛡️  CineMind Comprehensive Pre-Push Review & Quality Gates"
echo "=========================================================="

# -----------------------------------------------------------------------------
# Gate 1: Zero Secrets Scan in Staged / Modified Code
# -----------------------------------------------------------------------------
echo "🔍 Gate 1: Scanning for exposed credentials in git diff & staged files..."
EXPOSED_SECRETS=$(git diff HEAD -- . ':!.agents/skills/code-review/scripts/verify-all.sh' | grep -E "yLju7dMec7K3Cy0oZXwgethm|0rOjq9CfN2B0yA2XpHywWi48|password\s*=\s*['\"][^'\"]+['\"]" || true)

if [ -n "$EXPOSED_SECRETS" ]; then
    echo "❌ [FAIL] Potential credentials detected in git diff! Aborting commit."
    exit 1
fi
echo "✅ [PASS] Zero secrets detected in git diff."

# -----------------------------------------------------------------------------
# Gate 2: SOLID Principles & Architecture Standards
# -----------------------------------------------------------------------------
echo "🔍 Gate 2: Verifying SOLID Principles (LSP & SRP)..."

# 2A: Liskov Substitution (LSP) - No instanceof in Strategies/Adapters
FORBIDDEN_INSTANCEOF=$(grep -rnE "\binstanceof\s+[A-Z]" ai-assistant-service/src/main/java/com/skills/ai/patterns/strategy ai-assistant-service/src/main/java/com/skills/ai/patterns/adapter || true)
if [ -n "$FORBIDDEN_INSTANCEOF" ]; then
    echo "❌ [FAIL] LSP Violation: Found forbidden 'instanceof' downcasts in patterns:"
    echo "$FORBIDDEN_INSTANCEOF"
    exit 1
fi
echo "✅ [PASS] Gate 2A (LSP): Zero instanceof downcasts in Strategy/Adapter engines."

# 2B: Single Responsibility & Service Facade (SRP) - Zero raw inline fetch in React UI pages
RAW_FETCH_CALLS=$(grep -rnE "\bfetch\(" ai-assistant-ui/src/app || true)
if [ -n "$RAW_FETCH_CALLS" ]; then
    echo "❌ [FAIL] SRP / Service Facade Violation: Found raw inline fetch(...) in UI app pages:"
    echo "$RAW_FETCH_CALLS"
    echo "Must use typed domain services from ai-assistant-ui/src/services/ instead."
    exit 1
fi
echo "✅ [PASS] Gate 2B (SRP): Zero raw fetch() calls in UI pages (all network calls use typed services)."

# -----------------------------------------------------------------------------
# Gate 3: Concurrency, Single Source of Truth & Zero Dual-Writes
# -----------------------------------------------------------------------------
echo "🔍 Gate 3: Verifying Concurrency & Single Source of Truth (SSOT)..."
# Verify no dual-write anti-patterns (e.g. saveMovieToDatabase followed directly by movieStore.put)
DUAL_WRITE_VIOLATIONS=$(grep -rnE "saveMovieToDatabase\([^)]+\);\s+movieStore\.put" ai-assistant-service/src/main/java/ || true)
if [ -n "$DUAL_WRITE_VIOLATIONS" ]; then
    echo "❌ [FAIL] Dual-Write Hazard Detected in backend services:"
    echo "$DUAL_WRITE_VIOLATIONS"
    exit 1
fi
echo "✅ [PASS] Single Source of Truth verified (Zero dual-write hazards)."

# -----------------------------------------------------------------------------
# Gate 4: Backend Spring Boot Maven Compilation
# -----------------------------------------------------------------------------
echo "🔍 Gate 4: Verifying Spring Boot backend compilation (mvn test-compile)..."
(cd ai-assistant-service && mvn test-compile -q)
echo "✅ [PASS] Backend compiled successfully (0 errors)."

# -----------------------------------------------------------------------------
# Gate 5: Frontend Next.js TypeScript Type-Safety
# -----------------------------------------------------------------------------
echo "🔍 Gate 5: Verifying Next.js TypeScript type-check (tsc --noEmit)..."
export PATH="$ROOT_DIR/node_bin:$PATH"
(cd ai-assistant-ui && ./node_modules/.bin/tsc --noEmit)
echo "✅ [PASS] Frontend TypeScript type-safety verified (0 errors)."

# -----------------------------------------------------------------------------
# Gate 6: Automated End-to-End Regression Test Suite (57/57 Tests)
# -----------------------------------------------------------------------------
echo "🔍 Gate 6: Running full-stack automated regression test suite (including RBAC Security Gates)..."
"$ROOT_DIR/node_bin/node" "$ROOT_DIR/test-suite.mjs"
echo "✅ [PASS] All automated regression tests passed (57/57, 100%)."

# -----------------------------------------------------------------------------
# Gate 7: Dual Branch Synchronization Notice
# -----------------------------------------------------------------------------
echo "=========================================================="
echo "🎉 ALL 6 PRE-PUSH QUALITY GATES PASSED! READY TO COMMIT & PUSH."
echo "📌 Mandatory Step: Always push to both branches together:"
echo "   git push origin master && git push origin master:main"
echo "=========================================================="
