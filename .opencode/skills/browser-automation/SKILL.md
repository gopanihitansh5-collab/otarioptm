# Browser Automation

Operate the deployed app like a user, via Playwright or the cloud browser:
open the Vercel deployment, navigate landing -> studio, load templates,
run workflows, wait for completion (poll or WebSocket - never hold a
synchronous browser session open on long model calls), capture screenshots
to demo/screenshots/, and collect console errors and failed network
requests. There is no authentication - do not simulate a sign-in. Verify
the deployment is current before reporting a UI bug (stale builds lie).
Test the API independently of the UI for every scenario.
