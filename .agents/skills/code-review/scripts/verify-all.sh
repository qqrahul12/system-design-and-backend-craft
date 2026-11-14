#!/usr/bin/env bash
set -eo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../../.." && pwd)"
cd "$ROOT_DIR"

echo "=========================================================="
echo "🛡️  CineMind Pre-Push Code Review & Quality Gates"
echo "=========================================================="

# -----------------------------------------------------------------------------
# Check 1: Zero Secrets Scan in Staged / Modified Code
# -----------------------------------------------------------------------------
echo "🔍 Gate 1: Scanning for exposed credentials in git diff..."
EXPOSED_SECRETS=$(git diff HEAD | grep -E "yLju7dMec7K3Cy0oZXwgethm|0rOjq9CfN2B0yA2XpHywWi48|password\s*=\s*['\"][^'\"]+['\"]" || true)

if [ -n "$EXPOSED_SECRETS" ]; then
    echo "❌ [FAIL] Potential credentials detected in git diff! Aborting commit."
    exit 1
fi
echo "✅ [PASS] Zero secrets detected in git diff."

# -----------------------------------------------------------------------------
# Check 2: Liskov Substitution (LSP) - No instanceof in Strategies/Adapters
# -----------------------------------------------------------------------------
echo "🔍 Gate 2: Checking for forbidden 'instanceof' downcasts in Strategy/Adapter patterns..."
FORBIDDEN_INSTANCEOF=$(grep -rnE "\binstanceof\s+[A-Z]" ai-assistant-service/src/main/java/com/skills/ai/patterns/strategy ai-assistant-service/src/main/java/com/skills/ai/patterns/adapter || true)

if [ -n "$FORBIDDEN_INSTANCEOF" ]; then
    echo "❌ [FAIL] LSP Violation: Found forbidden 'instanceof' in patterns:"
    echo "$FORBIDDEN_INSTANCEOF"
    exit 1
fi
echo "✅ [PASS] Zero instanceof downcasts in Strategy/Adapter engines."

# -----------------------------------------------------------------------------
# Check 3: Backend Maven Compilation
# -----------------------------------------------------------------------------
echo "🔍 Gate 3: Verifying Spring Boot backend compilation (mvn test-compile)..."
(cd ai-assistant-service && mvn test-compile -q)
echo "✅ [PASS] Backend compiled successfully."

# -----------------------------------------------------------------------------
# Check 4: Frontend TypeScript Type-Safety
# -----------------------------------------------------------------------------
echo "🔍 Gate 4: Verifying Next.js TypeScript type-check (tsc --noEmit)..."
export PATH="$ROOT_DIR/node_bin:$PATH"
(cd ai-assistant-ui && ./node_modules/.bin/tsc --noEmit)
echo "✅ [PASS] Frontend TypeScript type-safety verified (0 errors)."

# -----------------------------------------------------------------------------
# Check 5: Automated Regression Test Suite (56/56 Tests)
# -----------------------------------------------------------------------------
echo "🔍 Gate 5: Running end-to-end regression test suite..."
"$ROOT_DIR/node_bin/node" "$ROOT_DIR/test-suite.mjs"
echo "✅ [PASS] All automated regression tests passed."

echo "=========================================================="
echo "🎉 ALL 5 PRE-PUSH QUALITY GATES PASSED! READY TO COMMIT & PUSH."
echo "Remember: Synchronize both master & main: git push origin master && git push origin master:main"
echo "=========================================================="
