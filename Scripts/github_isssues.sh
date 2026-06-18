#!/bin/bash

set -e

OWNER="Sahas2711"
REPO="ResolveX"
CSV_FILE="issues/issues.csv"

echo "===================================="
echo "ResolveX Issue Import"
echo "===================================="

# Verify CSV exists

if [ ! -f "$CSV_FILE" ]; then
echo "ERROR: CSV file not found -> $CSV_FILE"
exit 1
fi

# Get current authenticated GitHub user

ASSIGNEE=$(gh api user --jq .login)

echo "Repository : $OWNER/$REPO"
echo "Assignee   : $ASSIGNEE"
echo "CSV File   : $CSV_FILE"
echo ""

echo "===================================="
echo "Creating Issues"
echo "===================================="

tail -n +2 "$CSV_FILE" | while IFS='|' read -r TITLE DESCRIPTION LABEL MILESTONE
do
[ -z "$TITLE" ] && continue


echo ""
echo "Creating: $TITLE"
echo "Label    : $LABEL"
echo "Milestone: $MILESTONE"

gh issue create \
    --repo "$OWNER/$REPO" \
    --title "$TITLE" \
    --body "$DESCRIPTION" \
    --label "$LABEL" \
    --milestone "$MILESTONE" \
    --assignee "$ASSIGNEE" \
    || true


done


done


echo ""
echo "===================================="
echo "ResolveX Planning Setup Complete"
echo "===================================="
