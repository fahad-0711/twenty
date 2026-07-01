# n8n Workflow Exports

This directory contains exported n8n workflow JSON files from `flow.calllive.in`.

## Workflows

| File | Description | Trigger |
|------|-------------|---------|
| `high_intent_lead_alert.json` | Notifies team via Slack/email when a BOOKING_INTENT call is detected | Webhook from CRM |
| `daily_voice_summary.json` | Daily 9AM IST email report summarizing yesterday's calls | Cron (03:30 UTC) |

## How to Import

1. Open n8n at `https://flow.calllive.in`
2. Click **...** menu → **Import from file**
3. Select the `.json` file
4. Update credentials (Slack token, Gmail OAuth, CRM API token)
5. Activate the workflow

## How to Export

1. Open the workflow in n8n editor
2. Click **...** menu → **Download**
3. Save to this directory
4. Commit: `git add n8n-workflows/ && git commit -m "chore: update n8n workflow export"`
