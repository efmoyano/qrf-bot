# Testing Guide: 5-Minute Registration Close & Event Scheduling

This guide walks you through testing the bot with an initial event configuration where registration closes after **5 minutes**.

---

## Prerequisites
1. Ensure the bot is running (`npm run dev` or `pnpm dev`).
2. Ensure slash commands are up to date:
   ```bash
   pnpm register-commands
   ```
3. Ensure you have the `Alliance Admin` or `Event Admin` role (or Administrator permissions) in your Discord test server.

---

## Method 1: Instant Test using `/admin event announce` (Recommended)

You can trigger an immediate battlefield announcement with an explicit `close-in-minutes` parameter set to 5 minutes:

1. In any admin/bot channel, execute:
   ```text
   /admin event announce event:Desert Storm close-in-minutes:5
   ```
   *(Or select Canyon Storm if testing Canyon Storm)*.

2. **Verify Announcement**:
   - The bot posts the announcement embed in your configured announcement channel (or the current channel if none configured).
   - In the embed, look for:
     - **"Registration Closes:"** It should display a dynamic timestamp set to 5 minutes in the future (e.g. `<t:...:R>` showing "in 5 minutes").
     - The registration buttons: **Team A**, **Team B**, and **Can't Attend**.

3. **Simulate Player Registrations**:
   - Have test users (or yourself) click **Team A** or **Team B**.
   - Select your preferred squad (Tank, Air, Missile).
   - Confirm your name appears in the attendance roster list.

4. **Verify Mutual Exclusivity in Lineup Wizard**:
   - Open the lineup wizard:
     ```text
     /admin lineup wizard event:Desert Storm team:Team A
     ```
   - In the **Main Squad** tab, select a registered player.
   - Switch tabs to **Substitutes**:
     - Verify that the player assigned to Main Squad is **excluded from the selection list** and marked as assigned to Main.
   - Return to **Main Squad** and uncheck that player:
     - Verify they are immediately available in the **Substitutes** list again.

5. **Observe Automatic Registration Close**:
   - Once the timer expires (e.g. after 1 or 2 minutes when testing):
     - The buttons on the original announcement message (**Team A**, **Team B**, **Can't Attend**) are automatically **disabled**.
     - The bot automatically posts the official notice to the channel:
       > 🔒 **Registration Closed — Desert Storm**
       > *Registrations for this match cycle are now officially closed! Team captains are organizing rosters. You will receive a direct notification once final Main Squad and Substitutes rosters are published!*

6. **Publish Lineup & Verify Individual DMs**:
   - In `/admin lineup wizard event:Desert Storm team:Team A`, click **`[ 📢 Publish ]`** (or use `/admin lineup publish`):
     - The lineup embed is posted to the channel.
     - Each registered member receives a personal Direct Message:
       - 🏆 Main Squad: Match start time `<t:startsAt:F>`, squad, reminder.
       - 🔄 Substitutes: Standby instructions.
       - 🔵 Standby: Reserve notice.
     - The bot response contains a shortcut button: **`[ 🗺️ Plan Tactical Strategy ]`**!

7. **Plan Battlefield Tactical Strategy Map & Allocate Buildings**:
   - Run `/admin strategy wizard event:Desert Storm team:Team A` (or click the button on the lineup wizard):
     - **Structure Selector**: Switch between structures (Nuclear Silo, Arsenal, Mercenary Factory, Oil Refineries, Hospitals, Science Hub, Info Center).
     - **Player Selector**: Multi-select players from the Main Squad to allocate to the selected structure.
     - **`[ ⚡ Auto-Distribute ]`**: Automatically allocates the 20 starters across all 11 buildings based on tactical priorities (Top tanks to Nuclear Silo, missile squads to Arsenal, power distribution across refineries and hospitals).
     - **`[ 🖼️ Preview Map ]`**: Generates and sends a private high-res preview PNG of the battlefield schematic with player names, squads, power, and the side list of Substitutes.
     - **`[ 📢 Publish Strategy ]`** (or `/admin strategy publish`): Broadcasts the visual strategy map image and embed to the event channel, and sends target objective Direct Messages to each starter!
   - You can also view the map at any time with `/admin strategy view event:Desert Storm team:Team A`.

8. **Finalize Attendance & Verify Channel Recap + DMs**:
   - Run `/admin attendance wizard event:Desert Storm team:Team A`:
     - Mark any absent players (or leave all unchecked).
     - Click **`[ 🏁 Finalize Attendance ]`**.
   - **Public Channel Broadcast**: The bot immediately posts a match conclusion embed to the channel detailing:
     - 🏆 Main Squad participants
     - 🔄 Substitute participants
     - 🔵 Next Priority Awardees (benched players awarded the **Blue Priority Tag**)
     - 🔴 Absent / No-shows (if any)
   - **Direct Messages**: Each player receives a DM summarizing their attendance status and priority awards for next week!
   - The confirmation message displays a button: **`[ 🧹 Clean Channel Messages ]`**!

9. **Clean Up Past Bot Messages (Spam-Free Chat)**:
   - **Method A (1-Click Button)**: Click **`[ 🧹 Clean Channel Messages ]`** directly on the attendance finalized summary.
     - The bot immediately deletes all earlier event messages from the channel (announcement, registration closed notice, lineup embed, strategy map image) while preserving the final match recap!
   - **Method B (Slash Command)**: Run `/admin event cleanup`:
     ```text
     /admin event cleanup event:Desert Storm keep-recap:true
     ```
     - Options:
       - `channel`: (Optional) specify any channel.
       - `event`: (Optional) auto-locates the configured event channel.
       - `keep-recap`: `true` to keep the final match conclusion embed, or `false` to clean everything.
       - `limit`: (Optional) number of recent messages to scan (default 50, max 100).

---

## Method 2: Scheduled Event Config via `/admin event config` & `/admin event schedule`

To test setting up a persistent event schedule with custom cron and registration duration:

1. **Configure Registration Close Window**:
   Set the event to post in your channel with a custom close window (in hours):
   ```text
   /admin event config event:Desert Storm channel:#announcements close-hours:1 cron:*/10 * * * *
   ```
   *(The bot will confirm automatic posting is configured with the given cron and close duration).*

2. **Test Custom Cron Expression or One-Off ISO Date**:
   Use the `/admin event schedule` command to tweak upcoming event dates:
   - **Custom Cron**:
     ```text
     /admin event schedule cron:0 20 * * 5
     ```
   - **One-off Date**:
     ```text
     /admin event schedule date:2026-09-20T20:00:00Z
     ```
   *(The bot will validate the cron expression with node-cron and update the event schedule).*

3. **Check Upcoming Events**:
   Run:
   ```text
   /admin event upcoming
   ```
   Verify that the date, time, and registration window reflect your configured schedule.
