# SeatFlow Subagents

This directory contains specialized subagents for the SeatFlow flash-sale platform.

## Available Subagents

### 1. booking-concurrency-tester

Simulates and validates flash-sale concurrent booking scenarios to prevent overselling and ensure data consistency.

**When to use:**
- Before releasing booking-related changes
- When debugging overselling reports
- After modifying Redis lock or reservation logic
- Performance testing under load

**How to invoke:**
```
Use the Agent tool with:
- subagent_type: "booking-concurrency-tester"
- prompt: <your specific testing request>
```

**Example prompt:**
```
Run a concurrency test with 50 users trying to book from an event with 30 tickets. Report success rate, latency metrics, and any race conditions.
```

### 2. security-auditor

Scans the codebase for OWASP Top 10 vulnerabilities across authentication, payment, and API layers.

**When to use:**
- Before releases
- After auth/payment changes
- As periodic security review (weekly/monthly)
- After integrating third-party services

**How to invoke:**
```
Use the Agent tool with:
- subagent_type: "security-auditor"
- prompt: <your specific audit request>
```

**Example prompt:**
```
Perform a full security audit covering OWASP Top 10 vulnerabilities. Focus especially on JWT token handling and Stripe integration security.
```

---

## Testing Guide

For detailed testing instructions, see [SUBAGENT_TESTING_GUIDE.md](./SUBAGENT_TESTING_GUIDE.md).

---

## Quick Reference

### Prerequisites for booking-concurrency-tester
- Docker services running (postgres, redis, rabbitmq)
- Backend server running
- Test event with inventory

### Prerequisites for security-auditor
- Read access to project files
- No services required (static analysis)

---

## Adding New Subagents

To add a new subagent:

1. Create a `.md` file in this directory
2. Add frontmatter with `name` and `description`
3. Include clear purpose, context, files to read, task instructions, and output format
4. Add to SUBAGENT_TESTING_GUIDE.md if applicable

Example frontmatter:
```markdown
---
name: my-subagent
description: Brief description of what this subagent does
---

You are the **My Subagent**, a specialized agent for...

[Rest of the subagent instructions]
```

---

## Subagent Best Practices

1. **Clear Purpose**: State exactly what the subagent does
2. **Context First**: Explain the relevant project context
3. **File清单**: List all files the subagent needs to read
4. **Step-by-Step**: Provide clear, numbered task instructions
5. **Output Format**: Specify the expected report structure
6. **Error Handling**: Tell the subagent how to handle failures
7. **Testing**: Provide testing instructions

---

## Maintenance

- Keep subagent documentation updated as the project evolves
- Update file paths when refactoring occurs
- Review and improve subagent prompts based on feedback
- Add new subagents for new domains as needed

---

*For more information on subagent patterns, see AGENT_AND_SKILL_RECOMMENDATIONS.md in the project root.*