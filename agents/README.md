# Agent Directory

This directory contains definitions and resources for AI Agents used in Karte AI+ (and future RAG/Chatbot systems).

## Structure
Each agent has its own subdirectory containing:
- `system_prompt.md`: The persona and instructions for the agent.
- `knowledge/`: A folder containing markdown files with the knowledge base (product specs, FAQs, etc.) for RAG.

## Available Agents

### 1. Support Specialist (`support_specialist/`)
- **Role**: Customer support for handling email inquiries.
- **Knowledge Base**: Product specifications, pricing, security, and onboarding guidelines.
- **Usage**: Use the `system_prompt.md` as the system message and inject content from `knowledge/*.md` as context.
