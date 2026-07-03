#!/usr/bin/env bash
# Evidence collector for the tech-debt scorecard (docs/tech-debt-scorecard-*.md).
# Run from the repo root; paste the output into the next assessment.
# Purely read-only: gathers the numbers, humans assign the scores.
set -euo pipefail

section() { printf '\n== %s ==\n' "$1"; }

section "Source size & hotspots (top files are where debt concentrates)"
find app components lib -type f \( -name "*.ts" -o -name "*.tsx" \) \
  | xargs wc -l | sort -rn | head -8

section "Test surface (test files, tests, and what has none)"
ls lib/*.test.ts lib/**/*.test.ts 2>/dev/null || true
npx vitest run 2>&1 | grep -E "Test Files|Tests " || true
echo "route files without tests:"
find app/api -name "route.ts" | wc -l
echo "component files without tests:"
find components -name "*.tsx" | wc -l

section "Type & lint hygiene"
grep -E '"strict"' tsconfig.json || echo "strict NOT set"
# `grep -c`-style counts: `|| true` because a zero count is success here,
# but grep's no-match exit status would kill the script under pipefail.
echo "any-casts: $(grep -rEn 'as any|: any' --include='*.ts' --include='*.tsx' app lib components | wc -l || true)"
echo "todo-markers: $(grep -rn 'TODO\|FIXME\|HACK' --include='*.ts' --include='*.tsx' app lib components | wc -l || true)"
npm run lint > /dev/null 2>&1 && echo "lint: clean" || echo "lint: FAILING"

section "Dependency health"
npm audit 2>&1 | tail -4 || true
npm outdated || true

section "Observability (console-only logging is the debt signal)"
echo "console call sites: $(grep -rn 'console\.' --include='*.ts' app lib middleware.ts | wc -l || true)"

section "Schema artifacts (ordered migrations; stray docs/*.sql would be debt)"
ls supabase/migrations/ 2>/dev/null || echo "NO migrations dir"
ls docs/*.sql 2>/dev/null || echo "no stray SQL in docs/ (good)"

section "CI"
ls .github/workflows/ 2>/dev/null || echo "NO CI"
