# AI Development Rules for KIVI

## Project Overview
KIVI is an AI-first game sandbox engine for creating small, isometric, low-poly 3D games.

**Concept**: "AI-first game sandbox engine with small, isometric view optimized for low-poly"

**Name Origin**: KIVI (Finnish: "stone") - representing the fundamental building blocks

## Core Philosophy

### Constraints as Features
KIVI embraces limitations inspired by retro game consoles:
- Small scenes (like Game Boy stages)
- Limited resources per scene
- Grid-based structure
- Simple, clear game mechanics
- Isometric view as default perspective

### AI-First Design
- Natural language game creation
- MCP (Model Context Protocol) as primary interface
- Declarative scene definition
- JSON-based game structure

## Technology Stack (TBD)
- **3D Rendering**: Three.js (tentative)
- **Language**: JavaScript/TypeScript (TBD)
- **Bundler**: To be decided (Vite, Webpack, Parcel?)
- **MCP Server**: Architecture TBD

## Code Conventions (TBD)
- To be determined based on chosen stack
- Prefer clarity over cleverness
- Self-documenting code

## Development Philosophy

### Start Simple, Grow Naturally
- **Flat structure first**: Keep files at the root level until organization becomes necessary
  - ✅ `src/renderer.js`
  - ❌ `src/renderer/core/systems/rendering/main.js` (too early)

### YAGNI Principle
- Only build what you need right now
- Don't create "future-proof" abstractions
- Examples of YAGNI violations to avoid:
  - Creating an abstraction layer before you have 2 implementations
  - Building a plugin system before you have plugins
  - Adding configuration for features that don't exist yet

### When to Refactor
- When you copy-paste code 3+ times → extract to function
- When a file exceeds 300 lines → consider splitting
- When a pattern becomes clear → then abstract it
- Never before

### Prototype First
- Build a working example before generalizing
- Test ideas with minimal code
- Let the API design emerge from usage

## MCP Interface Design

### Goals
- Natural language to game creation
- Simple, declarative API
- Easy for AI to understand and use
- Immediate feedback

## Development Workflow
- Keep code simple and readable
- Write working examples first
- Document as you go
- **NEVER modify files without explicit user permission**
  - Always show the proposed changes first
  - Wait for user approval before applying
  - Exception: Only when user explicitly requests the change

## Notes
- This file will evolve as the project grows
- Decisions should be made when needed, not before
- Keep the spirit of constraint-based design
- Let AI-first philosophy guide architecture choices

## Next Steps
See TODO.md for current tasks and priorities.
