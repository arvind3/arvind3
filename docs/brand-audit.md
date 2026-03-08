# Brand Audit (As of 2026-03-08)

## Inputs Reviewed
- GitHub profile: https://github.com/arvind3
- GitHub API user snapshot (public repos, bio, followers)
- GitHub API repo inventory (`65` total repos, `25` owner repos, `40` forks)
- LinkedIn public metadata: https://www.linkedin.com/in/arvindkumarbhardwaj/
- Dashboard runtime + data:
  - https://arvind3.github.io/brand-analytics-dashboard/
  - https://arvind3.github.io/brand-analytics-dashboard/data-30days.json
  - https://arvind3.github.io/brand-analytics-dashboard/projects.json
- Dashboard source architecture: https://github.com/arvind3/brand-analytics-automation

## Key Findings

### Positioning and narrative
- Current GitHub bio is `Building AI` (generic, low differentiation).
- LinkedIn public metadata shows a strong senior narrative: `Transformation Lead`, `19+ years`, Houston, and deep content history in testing/data/DevOps.
- Opportunity: align GitHub headline and README language to your strongest intersection: AI engineering + QA intelligence + analytics instrumentation.

### Repository signal quality
- Repo inventory is fork-heavy (40/65), which dilutes credibility if surfaced in profile highlights.
- Known hygiene risks are present in portfolio framing:
  - `test` repository exists publicly.
  - Legacy forks such as `jekyll-incorporated` and `FlowViz` are visible in repo inventory.
- Because star counts are mostly near zero, ranking should favor recent activity + narrative relevance (not stars alone).

### Dashboard and proof layer
- Dashboard is live and functional with GA4 + GTM wiring and chart rendering.
- Live dataset (`data-30days.json`) currently reports:
  - totalUsers: `141`
  - totalPageViews: `328`
  - totalSessions: `155`
  - engagementRate: `16.7`
- The dashboard is technically strong but under-leveraged in the profile story.

### Validation and reliability
- Existing profile repo had only a basic Playwright check; no full brand-presence validation architecture.
- `brand-analytics-automation` already contains Playwright and workflows, which validates the approach and gives implementation precedent.

## Top 6 Original Repositories To Feature
(Selected from non-fork repos using recency + strategic relevance to AI/QA/analytics positioning.)

1. `qa-intelligence-platform`
2. `brand-analytics-automation`
3. `robot-finetune-model`
4. `retail_analytics`
5. `RobotFrameworkBookWithIDE`
6. `brand-analytics-dashboard`

## Dynamic vs Static Content Map

| Profile Element | Dynamic or Static | Data Source | Frequency | Mechanism |
|---|---|---|---|---|
| Hero headline + 2-3 sentence narrative | Static | Manual editorial | As needed | Direct README edits |
| Social badges/links | Static | Manual links | As needed | README markdown |
| Dashboard metrics strip | Dynamic | Dashboard JSON (`data-30days.json`) | Daily | `fetch-dashboard-metrics.js` + `inject-readme.js` |
| Top repos section (non-fork) | Dynamic | GitHub API repos endpoint | Weekly/Daily | `fetch-top-repos.js` + README marker injection |
| Recent activity (last 5 events) | Dynamic | GitHub Events API | Daily | `fetch-recent-activity.js` + marker injection |
| GitHub stats cards | Dynamic service | github-readme-stats / streak-stats | Real-time | SVG URLs in README |
| Contribution snake | Dynamic | Platane/snk action | Daily | GitHub Action asset generation |
| Last refreshed timestamp | Dynamic | Workflow run time | Every run | `inject-readme.js` marker update |
| Focus areas with proof links | Static | Manual editorial + repo links | As needed | README markdown |

## Strategic Outcome Target
- Move profile from static self-description to evidence-backed engineering brand.
- Show measurable system behavior (metrics, activity, validations) rather than claims.
- Make every dynamic section testable, then enforce with CI.
