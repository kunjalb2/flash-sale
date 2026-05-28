# Subagent Testing Guide

This guide provides step-by-step instructions for testing the SeatFlow subagents: `booking-concurrency-tester` and `security-auditor`.

## Quick Start

To test a subagent, use the command:

```
/guide-test-subagent <subagent-name>
```

Example: `/guide-test-subagent booking-concurrency-tester`

---

## Testing: booking-concurrency-tester

### Prerequisites

1. Start all required services:
```bash
cd backend
make docker-up
```

2. Verify services are running:
```bash
docker-compose ps
```

3. Start the backend:
```bash
cd backend
source .venv/bin/activate
make dev
```

4. Ensure you have a test event with inventory. Create one if needed:
```bash
# Via API or use /generate-sample-data skill
curl -X POST http://localhost:8000/api/v1/events \
  -H "Authorization: Bearer <your-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Test Event",
    "description": "Concurrency test event",
    "date": "2026-06-01T19:00:00",
    "total_tickets": 100,
    "price_cents": 1000
  }'
```

### Test Scenarios

#### Scenario 1: Basic Concurrency Test (N = M)

**What to test**: 50 users booking from 50 tickets (no overselling expected)

**Prompt**:
```
Run a concurrency test where 50 users try to book from an event with exactly 50 available tickets. Report:
- Total successful bookings
- Any overselling
- Latency metrics
- Redis lock behavior
```

**Expected Outcome**:
- Exactly 50 successful bookings
- 0 overselling (no double bookings)
- Success rate: 100%
- All locks acquired and released properly

#### Scenario 2: Overselling Pressure Test (N = 2M)

**What to test**: 100 users booking from 50 tickets (should reject 50)

**Prompt**:
```
Run a concurrency test where 100 users try to book from an event with only 50 available tickets. Report:
- Total successful bookings
- Total rejected bookings
- Error distribution
- Any race conditions
```

**Expected Outcome**:
- Exactly 50 successful bookings
- 50 rejected bookings (appropriate error messages)
- Success rate: 50%
- No race conditions detected

#### Scenario 3: Max Tickets Per User Test

**What to test**: One user trying to book more than max allowed

**Prompt**:
```
Test that a single user cannot book more than the max tickets per user limit. Report:
- Max tickets per user configuration
- Booking attempts and results
- Error messages for over-limit attempts
```

**Expected Outcome**:
- After 5 bookings (default limit), further attempts are rejected
- Appropriate error message about limit exceeded
- No bookings exceed the limit

#### Scenario 4: Reservation Timeout Test

**What to test**: Bookings that timeout before payment

**Prompt**:
```
Test the reservation timeout functionality. Report:
- Timeout configuration value
- Bookings created without payment
- Timeout expiration behavior
- Cleanup of expired reservations
```

**Expected Outcome**:
- Reservations expire after configured timeout
- Tickets are released back to inventory
- Cleanup process works correctly

### Validation Checklist

After running tests, verify the subagent report includes:

- [ ] Configuration values from `seatflow/config.py`
- [ ] Detailed scenario results (pass/fail)
- [ ] Success rate calculation
- [ ] Latency metrics (avg, P50, P95, P99)
- [ ] Lock contention data
- [ ] Any race conditions detected
- [ ] Recommendations for improvements
- [ ] Clear PASS/FAIL indicators

### Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Backend not reachable | Backend not started | Run `make dev` in backend directory |
| Redis connection error | Redis not running | Run `make docker-up` |
| No test events exist | Database empty | Create test event via API |
| Test hangs | Celery worker not running | Start Celery worker: `make celery` |

---

## Testing: security-auditor

### Prerequisites

1. Ensure all project files are accessible:
```bash
cd /Users/kunjal/Kunjal/python/flash-sale
```

2. No services need to be running for this test (static analysis)

### Test Scenarios

#### Scenario 1: Full OWASP Top 10 Scan

**Prompt**:
```
Perform a full security audit covering all OWASP Top 10 vulnerabilities. Report:
- Overall security score
- Critical, high, medium, and low issues
- OWASP compliance table
- Specific findings with file locations and line numbers
```

**Expected Outcome**:
- Comprehensive OWASP Top 10 analysis
- Detailed issue report with severity levels
- Compliance table showing status of each category
- Actionable recommendations

#### Scenario 2: JWT Security Assessment

**Prompt**:
```
Focus specifically on JWT token security. Report:
- Token expiry configuration
- Secret key handling
- Refresh token flow
- Any logging of tokens
- Security concerns
```

**Expected Outcome**:
- JWT implementation analysis
- Expiry and refresh flow validation
- No tokens logged or exposed
- Secrets properly managed

#### Scenario 3: Payment Security Review

**Prompt**:
```
Audit the Stripe payment integration for security issues. Report:
- Webhook signature verification
- Idempotency key usage
- Sensitive data logging
- Test vs production mode separation
- Any payment security vulnerabilities
```

**Expected Outcome**:
- Webhook signatures verified
- Idempotency keys used
- No sensitive payment data logged
- Clear separation of test/production modes

#### Scenario 4: API Security Check

**Prompt**:
```
Review API endpoint security. Report:
- Rate limiting coverage
- Authentication on protected routes
- Input validation
- CORS configuration
- Any API security issues
```

**Expected Outcome**:
- All protected routes have auth
- Rate limiting on sensitive endpoints
- Input validation via Pydantic
- Properly configured CORS

#### Scenario 5: Secret Management Audit

**Prompt**:
```
Audit secret management practices. Report:
- Hardcoded secrets in code
- Environment variable usage
- .gitignore coverage
- .env.example completeness
- Any secret exposure risks
```

**Expected Outcome**:
- No hardcoded secrets found
- All secrets via environment variables
- .env files in .gitignore
- Complete .env.example

### Validation Checklist

After running tests, verify the subagent report includes:

- [ ] Executive summary with security score
- [ ] Issue count by severity (critical/high/medium/low)
- [ ] Critical issues clearly identified
- [ ] OWASP Top 10 compliance table
- [ ] Payment security assessment
- [ ] Authentication security assessment
- [ ] API security findings
- [ ] Secret management audit results
- [ ] Prioritized recommendations
- [ ] File references with line numbers

### Common Issues and Fixes

| Issue | Cause | Fix |
|-------|-------|-----|
| Files not found | Wrong working directory | Ensure you're in project root |
| Incomplete report | Subagent missed files | Re-run with explicit file list |
| False positives | Conservative analysis | Review findings manually |

---

## Automated Testing Script

To automate basic validation of both subagents:

```bash
#!/bin/bash
# test-subagents.sh

echo "Testing booking-concurrency-tester..."
# This would be run via Claude Code Agent tool
echo "Prompt: Run a basic concurrency test with 10 users and 10 tickets"

echo ""
echo "Testing security-auditor..."
# This would be run via Claude Code Agent tool
echo "Prompt: Perform a security audit focusing on JWT and payment security"
```

---

## Integration with CI/CD

Consider adding subagent checks to your CI pipeline:

```yaml
# .github/workflows/security-audit.yml
name: Security Audit

on:
  pull_request:
  schedule:
    - cron: '0 0 * * 0'  # Weekly

jobs:
  security-audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Security Auditor
        # Would invoke Claude Code with security-auditor subagent
        run: claude-agent security-auditor
      - name: Upload Report
        uses: actions/upload-artifact@v3
        with:
          name: security-report
          path: security-audit-report.md
```

---

## Troubleshooting

### Subagent Not Found

If you get "subagent not found" error:
1. Check file exists: `.claude/agents/<subagent-name>.md`
2. Verify frontmatter is correct (name field)
3. Restart Claude Code if needed

### Subagent Hangs

If subagent appears to hang:
1. Check if it's waiting for user input
2. Cancel and re-run with clearer prompt
3. Check logs for errors

### Poor Report Quality

If subagent produces poor reports:
1. Provide more specific prompts
2. Specify which files to focus on
3. Report the issue for subagent improvement

---

## Feedback

To improve these subagents:
1. Document any issues encountered
2. Suggest additional test scenarios
3. Report false positives or missed vulnerabilities
4. Propose new subagents for other domains

---

*Last updated: 2026-05-28*