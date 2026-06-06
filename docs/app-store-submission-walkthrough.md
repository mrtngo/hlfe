# Rayo — App Store Submission Walkthrough (beginner edition)

Everything is already prepared on the code side. This is the human-clicks part.
Two accounts are involved:
- **Xcode** (the app on your Mac) — turns the project into an uploadable build.
- **App Store Connect** (the website `appstoreconnect.apple.com`) — the store listing.

Do the phases in order. Most snags are covered in the **"If it goes wrong"** notes.

---

## PHASE 0 — One thing to do FIRST (or you'll get stuck at the end)

Apple **will not let you submit** without two working web pages:
- a **Privacy Policy** URL
- a **Support** URL

They must be real, public, reachable pages. Get these live before Phase 2.
*(Claude offered to draft both in Spanish — do that, publish them somewhere on
`rayotrade.xyz`, and note the two URLs. You'll paste them in Phase 3.)*

---

## PHASE 1 — Make the build in Xcode

> The web bundle is already built and synced with your live API. You just need to
> sign it and upload it.

1. **Open the project.** In Terminal, from the project folder, run:
   ```bash
   npm run cap:open
   ```
   Xcode opens.

2. **Pick your signing team.**
   - In the left panel, click the blue **App** icon at the very top.
   - In the middle, select the **App** target, then the **Signing & Capabilities** tab.
   - Tick **Automatically manage signing**.
   - **Team** dropdown → choose your team. If it's empty: **Add an Account…** →
     sign in with the Apple ID that has your Developer membership → then pick the team.
   - The "Provisioning Profile" line should go green/no-error. (Xcode creates it for you.)

3. **Choose the right destination.**
   - At the top of the Xcode window, next to the ▶︎/◼︎ buttons, there's a device
     dropdown. Click it → choose **Any iOS Device (arm64)**.
   - ⚠️ If it says a Simulator (e.g. "iPhone 17 Pro Max"), the next step is greyed
     out. It MUST be "Any iOS Device".

4. **Archive.** Top menu: **Product → Archive**. Wait a few minutes.
   - When done, the **Organizer** window pops up showing your archive.

5. **Upload.**
   - Click **Distribute App** → **App Store Connect** → **Next**.
   - Choose **Upload** → **Next** → keep the defaults (let it manage signing) →
     **Upload**.
   - Wait for "Upload Successful."

6. **Wait for processing.** Apple processes the build for ~5–30 min. You'll get an
   email "…has completed processing." Don't wait staring at it — move to Phase 2.

**If it goes wrong:**
- *"No account / team"* → you skipped the sign-in in step 2.
- *"Archive" is greyed out* → destination is a Simulator (step 3).
- *Version error on a re-upload* → bump the build number: App target → **General**
  → **Build** → change `1` to `2`. (Marketing Version `1.0` stays.)

---

## PHASE 2 — Create the app on App Store Connect

1. Go to **appstoreconnect.apple.com** → sign in.
2. Click **Apps** → the **➕ (top-left)** → **New App**.
3. Fill the form:
   - **Platform:** iOS
   - **Name:** `Rayo` *(must be unique in the whole App Store; if taken, try
     "Rayo Trade" or "Rayo: Cripto")*
   - **Primary Language:** Spanish (Mexico)
   - **Bundle ID:** pick **`xyz.rayotrade.app`** from the dropdown
   - **SKU:** any private code, e.g. `rayo-ios-001`
   - **User Access:** Full Access
4. Click **Create**.

**If `xyz.rayotrade.app` isn't in the Bundle ID dropdown:** the Archive in Phase 1
usually registers it automatically. If not, go to **developer.apple.com** →
**Certificates, IDs & Profiles** → **Identifiers** → **➕** → **App IDs** → **App**
→ description `Rayo`, Bundle ID (Explicit) `xyz.rayotrade.app` → **Register**, then
come back and refresh.

---

## PHASE 3 — Fill in the listing

In your new app, left sidebar, click the version **"1.0 Prepare for Submission"**.

1. **Text fields** — copy from `docs/app-store-metadata.md`:
   - **Promotional Text**
   - **Description**
   - **Keywords**
   - **Support URL** ← from Phase 0
   - **Marketing URL** (optional) → `https://www.rayotrade.xyz`

2. **Screenshots.** Scroll to **iPhone 6.9" Display**. Drag in the 4 PNGs from
   `docs/app-store-screenshots/` (`01-landing-hero`, `02-mercados`, `03-avanzado`,
   `04-login`). That one size is enough — Apple reuses it for smaller phones.

3. **App icon** is pulled automatically from your uploaded build — nothing to do.

---

## PHASE 4 — The three questionnaires

1. **Age Rating.** Left sidebar **General → App Information** → next to **Age
   Rating** click **Edit** → answer honestly. With crypto trading + Polymarket,
   expect **17+**. Save.

2. **App Privacy.** Left sidebar **App Privacy** → **Get Started** → declare
   (from the metadata doc): **Email Address**, **Crash Data**, **Product
   Interaction**; answer **No** to tracking. → **Publish**.

3. **Pricing & Availability.** Left sidebar **Pricing** → **Free** → choose your
   countries (e.g. all of Latin America). Save.

---

## PHASE 5 — Attach the build + reviewer info

Back on the **"1.0 Prepare for Submission"** page:

1. **Build.** Scroll to **Build** → click **➕ / Add Build** → select the build
   that finished processing (from Phase 1). If it's missing, processing isn't done
   yet — wait for the email.

2. **Export compliance** (pops up when you add the build): **Yes**, it uses
   encryption → **Yes**, it's exempt (standard HTTPS only). *(You can skip this
   prompt on future uploads by adding `ITSAppUsesNonExemptEncryption = false` to
   Info.plist — see the metadata doc.)*

3. **App Review Information.** Fill your contact email/phone, and — critically —
   give the reviewer a **demo login** or notes (template in the metadata doc).
   A wallet app with no way in **gets rejected**.

4. **Version Release.** Pick **Automatically release** (goes live the moment it's
   approved) or **Manually**.

---

## PHASE 6 — Submit

Top-right: **Add for Review** → **Submit for Review**.

Review takes ~24–48h. You'll get an email on approval or rejection.

---

## ⚠️ The realistic risk for THIS app

It's a crypto-trading app with leverage and prediction markets. Apple's
**Guideline 3.1.5(b)** lets crypto-exchange apps be offered "only by the exchange
itself, in countries with appropriate licensing." If they push back, they'll ask
for your entity + which regions you're licensed/permitted in. Have that answer
ready in the **App Review → Notes** field. This is the most likely hold-up — not
anything technical.

---

## Quick status of what's already done for you
- ✅ App builds, signs-ready, web bundle wired to the live API (`www.rayotrade.xyz`)
- ✅ CORS deployed & verified live
- ✅ Metadata drafted (`docs/app-store-metadata.md`)
- ✅ Screenshots ready (`docs/app-store-screenshots/`)
- ⬜ Privacy + Support pages (Phase 0) — **the one thing still blocking you**
- ⬜ Everything in Phases 1–6 (your clicks)
