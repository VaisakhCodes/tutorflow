# Session State Machine

## Overview
This document defines the lifecycle states and transition rules for tutoring sessions in TutorFlow.

## Lifecycle States

Scheduled
  ↓
In progress
  ↓
Completed
  ↓
AI reviewed

## State Transition Rules
- **Forward Progress Only**: Sessions cannot skip states (e.g. `Scheduled` cannot jump straight to `Completed`).
- **No Reverse Transitions**: Sessions cannot move backward (e.g. `In progress` cannot revert to `Scheduled`).
- **Immutability upon Completion**: Completed sessions are locked against normal editing.
- **Post-Completion Action**: AI review is the only permitted action after a session is marked as `Completed`.
- **Enforcement**: The final application implementation must enforce these rules strictly on the server-side.
