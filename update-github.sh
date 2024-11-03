#!/bin/bash

# Add all changes
git add .

# Get the commit message as an argument
commit_message="$1"

# If no message provided, use a default
if [ -z "$commit_message" ]; then
    commit_message="Update from conversation with AI assistant"
fi

# Commit and push
git commit -m "$commit_message"
git push 