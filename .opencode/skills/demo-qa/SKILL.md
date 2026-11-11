# Demo QA

Verify every scenario in demo/scenarios/ end-to-end before it is presented:
API-level checks first, then a real browser pass on the current production
deployment. Record status (verified/partial/blocked) and evidence in
demo/reports/. A scenario passes only if its validation block checks out
against the real system - never mark simulated output as passed. Run the
full pytest suite before any demo-related change lands.
