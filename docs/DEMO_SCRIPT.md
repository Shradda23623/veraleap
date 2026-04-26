# 90-Second Demo Video Script

Record this with [Loom](https://www.loom.com) (free) or QuickTime. Aim for **75–90 seconds**, not longer. Recruiters scrub past anything that drags.

## Setup before recording

- Hard refresh the deployed site once so the first load is warm.
- Have three browser tabs ready, each pre-logged-in:
  1. **Tenant** account
  2. **Broker** account (so you can show 2FA + adding a listing)
  3. **Admin** account (so you can show the admin verification panel)
- Close all other tabs and notification widgets.
- Set zoom to 110% so text is readable in compressed video.

## The script

> Keep camera off. Speak naturally — don't read this verbatim. Pause briefly between sections.

**[0:00 – 0:08] — Hook**
> "Rental scams are one of the most common frauds in India. I built VeraLeap to fix that — every listing is tied to a verified owner or broker, and the whole platform is designed around trust."

*Action:* Show home page, hover the map, click a listing.

**[0:08 – 0:25] — Renter flow**
> "Renters get a map-first search, filter by city, budget, and amenities, and see verified listings with reviews and broker credibility built in."

*Action:* Filter by city, click into a property detail page, scroll past gallery, reviews, and broker info. Save as favorite.

**[0:25 – 0:42] — Broker flow + 2FA**
> "Brokers and owners can add listings with a draggable map picker. High-trust roles like brokers are forced through TOTP two-factor enrollment — scam prevention starts with account security."

*Action:* Switch to broker tab, show "Add Property" page with the location picker, then show MFA enrollment screen.

**[0:42 – 0:58] — Admin flow**
> "Admins get a dashboard to verify brokers, review reported listings, and approve them. Reports are rate-limited at the database layer to prevent abuse."

*Action:* Switch to admin tab, show admin panel with verification queue and report list.

**[0:58 – 1:15] — Architecture punch**
> "Under the hood it's React, TypeScript, and Supabase. Every table has row-level security policies enforced at Postgres, real-time notifications stream over Postgres CDC, and there's a four-role RBAC system: tenants, owners, brokers, and admins."

*Action:* Cut to the architecture diagram in the README briefly, or stay on the dashboard with notification bell visible.

**[1:15 – 1:30] — Close**
> "It's deployed on Vercel with a 95+ Lighthouse score, error tracking through Sentry, and full CI/CD on GitHub Actions. The repo and a live demo are linked below."

*Action:* End on the home page or the GitHub repo with the README visible.

## After recording

- Trim silences at start and end with Loom's editor.
- Set a custom thumbnail showing the home page with the map.
- Copy the public Loom link.
- Embed at the top of `README.md` like this:

```markdown
## Demo

[![Watch the demo](docs/screenshots/hero.png)](https://www.loom.com/share/YOUR_VIDEO_ID)

90-second walkthrough of the renter, broker, and admin flows.
```

## Common mistakes to avoid

- Don't narrate every click. Skip the obvious ("now I'm clicking the button…").
- Don't show login screens — start logged in.
- Don't show empty pages. Seed at least 8–10 listings before recording.
- Don't go over 90 seconds. Recruiters drop off fast.
- Don't include audio of background noise. Use a quiet room or a headset mic.
