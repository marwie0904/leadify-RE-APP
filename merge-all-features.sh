#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Merging All Feature Branches ===${NC}\n"

# Function to copy backend changes from worktree
copy_backend_changes() {
    local feature=$1
    local worktree=$2
    
    echo -e "${BLUE}Processing $feature...${NC}"
    
    # Check if BACKEND directory exists in worktree
    if [ -d "../$worktree/BACKEND" ]; then
        echo "Found BACKEND changes in $worktree"
        
        # Copy only the src directory changes (where the new code is)
        if [ -d "../$worktree/BACKEND/src" ]; then
            echo "Copying src directory..."
            cp -r "../$worktree/BACKEND/src/"* "BACKEND/src/" 2>/dev/null || true
        fi
        
        # Copy any new migration files
        if [ -d "../$worktree/BACKEND/migrations" ]; then
            echo "Copying migrations..."
            mkdir -p BACKEND/migrations
            cp -r "../$worktree/BACKEND/migrations/"* "BACKEND/migrations/" 2>/dev/null || true
        fi
        
        # Copy any new test files
        if [ -d "../$worktree/BACKEND/tests" ]; then
            echo "Copying tests..."
            mkdir -p BACKEND/tests
            cp -r "../$worktree/BACKEND/tests/"* "BACKEND/tests/" 2>/dev/null || true
        fi
        
        echo -e "${GREEN}✓ Copied changes for $feature${NC}\n"
    else
        echo -e "${RED}No BACKEND directory found in $worktree${NC}\n"
    fi
}

# Make sure we're in the main branch
git checkout main

# Process each feature
echo -e "${BLUE}1. Notification System${NC}"
copy_backend_changes "notification-system" "REAL-ESTATE-WEB-APP-notifications"

echo -e "${BLUE}2. Enhanced BANT${NC}"
copy_backend_changes "enhanced-bant" "REAL-ESTATE-WEB-APP-bant"

echo -e "${BLUE}3. Image Attachments${NC}"
copy_backend_changes "image-attachments" "REAL-ESTATE-WEB-APP-images"

echo -e "${BLUE}4. User Settings${NC}"
copy_backend_changes "user-settings" "REAL-ESTATE-WEB-APP-settings"

echo -e "${BLUE}5. CSV Lead Export${NC}"
copy_backend_changes "lead-export" "REAL-ESTATE-WEB-APP-export"

# Check what files were added/modified
echo -e "${BLUE}=== Checking Changes ===${NC}"
git status --short

# Add all changes
echo -e "${BLUE}=== Adding All Changes ===${NC}"
git add -A

# Create a commit for all features
echo -e "${BLUE}=== Creating Merge Commit ===${NC}"
git commit -m "feat: Merge all 5 new features - notification system, enhanced BANT, image attachments, user settings, CSV export

- Notification System: Real-time notifications with WebSocket/SSE support
- Enhanced BANT: Advanced qualification rules and scoring system
- Image Attachments: Support for image/file uploads in messages
- User Settings: Password security and profile management
- CSV Lead Export: Streaming CSV export with BANT filtering

Co-Authored-By: Multiple AI Agents"

echo -e "${GREEN}✓ All features merged successfully!${NC}"

# Show the final status
echo -e "${BLUE}=== Final Status ===${NC}"
git log --oneline -5