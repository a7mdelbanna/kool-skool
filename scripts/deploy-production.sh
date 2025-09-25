#!/bin/bash

# Production Deployment Script
# This script helps deploy to production branch

set -e  # Exit on error

echo "🚀 Starting Production Deployment Process"
echo "=========================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if we're on main branch
CURRENT_BRANCH=$(git rev-parse --abbrev-ref HEAD)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}Warning: You're not on main branch. Current branch: $CURRENT_BRANCH${NC}"
    read -p "Do you want to continue? (y/n) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Deployment cancelled."
        exit 1
    fi
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo -e "${RED}Error: You have uncommitted changes!${NC}"
    echo "Please commit or stash your changes before deploying."
    exit 1
fi

echo "✅ Pre-deployment checks passed"

# Run tests
echo ""
echo "Running tests..."
if npm test -- --passWithNoTests; then
    echo -e "${GREEN}✅ All tests passed${NC}"
else
    echo -e "${RED}❌ Tests failed! Aborting deployment.${NC}"
    exit 1
fi

# Build the project
echo ""
echo "Building production bundle..."
if npm run build; then
    echo -e "${GREEN}✅ Build successful${NC}"
else
    echo -e "${RED}❌ Build failed! Aborting deployment.${NC}"
    exit 1
fi

# Create or switch to production branch
echo ""
echo "Preparing production branch..."
if git show-ref --verify --quiet refs/heads/production; then
    # Production branch exists
    git checkout production
    git merge main --no-edit
else
    # Create production branch
    echo "Creating production branch..."
    git checkout -b production
fi

# Push to production
echo ""
echo "Pushing to production branch..."
if git push origin production; then
    echo -e "${GREEN}✅ Successfully pushed to production!${NC}"
else
    echo -e "${RED}❌ Push failed!${NC}"
    git checkout main
    exit 1
fi

# Return to main branch
git checkout main

echo ""
echo -e "${GREEN}🎉 Deployment to production branch complete!${NC}"
echo "Netlify will automatically deploy from the production branch."
echo ""
echo "Next steps:"
echo "1. Check Netlify dashboard for deployment status"
echo "2. Verify the live site once deployment is complete"
echo "3. Monitor error logs and performance metrics"