# Demo script: duty periods and public search

About 8 minutes, or 5 without the optional Part D. Everything happens in Swagger, except one terminal command in Part B.

## Before the demo

Use PowerShell, from the repository root, on the day of the demo. The seed dates its examples from the day it first runs, so seed fresh.

First time on this computer only. It asks for your `postgres` password:

```powershell
psql -U postgres -h localhost -c "CREATE ROLE smartshelf LOGIN PASSWORD 'smartshelf_local_only'" -c "CREATE DATABASE smartshelf OWNER smartshelf"
```

Every other time, stop the API first, then start from an empty database:

```powershell
psql -U postgres -h localhost -c "DROP DATABASE IF EXISTS smartshelf WITH (FORCE)" -c "CREATE DATABASE smartshelf OWNER smartshelf"
```

Then seed and start the API:

```powershell
npm run db:deploy
$env:ALLOW_DEMO_SEED = 'true'; npm run db:seed; Remove-Item Env:ALLOW_DEMO_SEED
npm run build -w @smartshelf/api
npm start -w @smartshelf/api
```

Use these, not `npm run dev:api`, which restarts itself once just after starting and answers "Failed to fetch" for a few seconds.

Wait for the `API: http://localhost:3000/api/health` line, then open <http://localhost:3000/api/docs>. Keep the window open, and open a second PowerShell in `apps/api` for Part B.

**How to run any step in Swagger:** click the route to open it, click **Try it out**, fill in what the step says, click **Execute**. The answer is under **Server response**. If the route is already open, just change the fields and click **Execute** again. Open each route from its section: **auth**, **pharmacist**, **inventory** or **public**.

If a step goes wrong, the fix is usually one of these:

| You see | Do this |
| --- | --- |
| `401` on a pharmacist route | Do the Authorize part of Step 1 again. Reloading the page clears it. |
| `409` on Step 3 or Step 5 | You already ran the demo on this database. Start again from "Before the demo". |
| `409` on Step 10 or Step 13 | The same. A medicine name can be added once per pharmacy. |
| "Failed to fetch" | The API is not running. Check the first window. |

## Part A: sign in and duty periods

**Step 1. Sign in as the seeded pharmacist**

Open `POST /api/auth/login` under **auth**.

```json
{ "email": "active@smartshelf.test", "password": "DemoPass123!" }
```

Expect **200**. Look for `accessToken` and `"role": "PHARMACIST"`.

Copy the long `accessToken` value without its quotes. Click the green **Authorize** button at the top right, paste it into the **Value** box without typing "Bearer", click **Authorize**, then **Close**.

_Say: "The pharmacy comes from this token. The API never accepts a pharmacy ID from the request."_

**Step 2. Show the profile**

Open `GET /api/pharmacist/profile` under **pharmacist**.

Expect **200**. Look for `"name": "Demo Pharmacy 1"` and `"subscriptionStatus": "ACTIVE"`.

**Step 3. Create an overnight period, 20:00 to 08:00**

Open `POST /api/pharmacist/duty-periods` under **pharmacist**.

```json
{
  "startsAt": "2026-12-20T20:00:00+03:00",
  "endsAt": "2026-12-21T08:00:00+03:00"
}
```

Expect **201**. Look for `"startsAt": "2026-12-20T17:00:00.000Z"` and `"endsAt": "2026-12-21T05:00:00.000Z"`.

_Say: "I send Jordan time with its offset, and the API answers in UTC, so 20:00 becomes 17:00Z. It crosses midnight and that is fine, because a period may last up to 24 hours."_

**Step 4. Try an overlapping period**

This starts at 02:00, inside the period from Step 3. Replace the whole body.

Open `POST /api/pharmacist/duty-periods` under **pharmacist**.

```json
{
  "startsAt": "2026-12-21T02:00:00+03:00",
  "endsAt": "2026-12-21T10:00:00+03:00"
}
```

Expect **409**. Look for `This duty period overlaps an existing duty period.`

_Say: "Nothing was saved. A period may start exactly when another ends, because the end instant is not part of the period. Other pharmacies are not compared. Two requests at the same moment also cannot both get through, because each one locks the pharmacy's row in PostgreSQL first."_

**Step 5. Add the next period**

This fills in `nextDuty` for Part B. Replace the whole body.

Open `POST /api/pharmacist/duty-periods` under **pharmacist**.

```json
{
  "startsAt": "2026-12-22T20:00:00+03:00",
  "endsAt": "2026-12-23T08:00:00+03:00"
}
```

Expect **201**.

## Part B: on duty at 02:00, not at 09:00

The API always uses the current time. This helper asks the real application, with the real database query and mapper, with only its clock set to the times you give. It runs in its own process and changes no data.

In the second PowerShell, in `apps/api`:

```powershell
npx tsx src/modules/public/testing/duty-at.ts 2026-12-21T02:00:00+03:00 2026-12-21T09:00:00+03:00
```

You should see:

- At 02:00: `On duty: Demo Pharmacy 1`, with `"onDutyNow": true` and the Step 3 times in `currentDuty`.
- At 09:00: `On duty: nobody`, with `"onDutyNow": false`, `"currentDuty": null` and the Step 5 times in `nextDuty`.

_Say: "02:00 is inside the overnight period. At exactly 08:00 the period is already over, because the start instant counts and the end instant does not."_

## Part C: public search, no sign-in

These routes have no lock icon. Anyone can call them.

**Step 6. Search by display name**

Open `GET /api/public/medicines` under **public**. Set `q` to `panadol`. Leave `area` and `onDutyNow` empty, here and in the next steps.

Expect **200**. Look for `"name": "Demo Pharmacy 1"` and `"total": 1`. Must not show `Panadol`, `quantity`, `"id"`, `unitCost` or `subscription`.

_Say: "Four seeded pharmacies stock Panadol, but only one has an active subscription, so only that one appears. The answer does not repeat the medicine, and it never shows a quantity."_

**Step 7. Search by scientific name**

Open `GET /api/public/medicines` under **public**. Set `q` to `paracetamol`.

Expect **200**. Look for `"name": "Demo Pharmacy 1"` and `"total": 1`.

_Say: "Panadol's scientific name finds the same pharmacy, once. Part of a name in any case also works."_

**Step 8. Stock that does not count**

Open `GET /api/public/medicines` under **public**. Set `q` to `ibuprofen`.

Expect **200**. Look for `"items": []` and `"total": 0`.

_Say: "This active pharmacy has Ibuprofen, but one batch has expired and the other is empty. A batch counts only if it has units and has not expired, and an empty result is a normal answer."_

**Step 9. The directory**

Open `GET /api/public/pharmacies` under **public**. Leave every field empty.

Expect **200**. Look for `"name": "Demo Pharmacy 1"` and `"total": 1`. Must not show `Demo Pharmacy 2`, `Demo Pharmacy 3` or `Demo Pharmacy 4`.

_Say: "Those three have expired, suspended or no subscription, so they are hidden everywhere, even though they have stock and their data is kept."_

## Part D: optional, expired-only and zero-only

Step 8 mixes both cases. These add one of each. Still signed in from Step 1.

**Step 10. Add a medicine for the expired-only case**

Open `POST /api/pharmacist/medicines` under **inventory**.

```json
{
  "displayName": "Demo Expired",
  "scientificName": "Expiredol",
  "category": "Demo",
  "reorderThreshold": 5
}
```

Expect **201**. Copy the `id` from the answer.

**Step 11. Give it one expired batch**

Open `POST /api/pharmacist/medicines/{id}/batches` under **inventory**. Set `id` to the `id` from Step 10.

```json
{
  "batchNumber": "E-1",
  "quantity": 9,
  "expiryDate": "2026-01-01",
  "storageLocation": "Shelf 9",
  "unitCost": "1.50"
}
```

Expect **201**.

**Step 12. Search for it**

Open `GET /api/public/medicines` under **public**. Set `q` to `expiredol`.

Expect **200**. Look for `"items": []` and `"total": 0`.

**Step 13. Add a medicine for the zero-only case**

Open `POST /api/pharmacist/medicines` under **inventory**.

```json
{
  "displayName": "Demo Empty",
  "scientificName": "Zerodol",
  "category": "Demo",
  "reorderThreshold": 5
}
```

Expect **201**. Copy the `id` from the answer.

**Step 14. Give it one empty batch**

Open `POST /api/pharmacist/medicines/{id}/batches` under **inventory**. Set `id` to the `id` from Step 13.

```json
{
  "batchNumber": "Z-1",
  "quantity": 0,
  "expiryDate": "2030-01-01",
  "storageLocation": "Shelf 9",
  "unitCost": "1.50"
}
```

Expect **201**.

**Step 15. Search for it**

Open `GET /api/public/medicines` under **public**. Set `q` to `zerodol`.

Expect **200**. Look for `"items": []` and `"total": 0`.

## Part E: the privacy allowlist

**Step 16. Compare Swagger's example with a real answer**

1. Open `GET /api/public/pharmacies` under **public**.
2. Under **Responses**, in the **200** row, open the **Examples** dropdown and choose **Privacy: these are the only fields a citizen can ever see**.
3. Compare it with the real answer from Step 9, just above it on the same screen, and with the 02:00 answer from Part B. In Step 9, `currentDuty` is `null` unless the seeded overnight period is running; the 02:00 answer always has both periods.

Both have exactly these keys, and nothing else at any depth:

| Level | Keys |
| --- | --- |
| Top | `items`, `total` |
| Each pharmacy | `name`, `area`, `address`, `phone`, `onDutyNow`, `currentDuty`, `nextDuty`, `inventoryUpdatedAt` |
| Inside `currentDuty` and `nextDuty` | `startsAt`, `endsAt` |

_Say: "A citizen needs to know where to go and when it is open, not how much stock a pharmacy holds. Exact quantities stay private because they are commercial information and could be used to target a pharmacy. The mapper copies each public field by name, so a new database column can never reach a citizen by accident."_

## If you are asked

- **Why can the answer in Step 6 show `"onDutyNow": true` or `false`?** It uses the real time. The seed adds an overnight period from 20:00 on the day it first ran, so the value depends on when you run the demo. Part B is the part that shows fixed times.
- **What if someone uses an expired token, or none?** `401`. An owner gets `403`.
- **Are these real answers?** Yes. Saved copies from the rehearsal are in `demo-responses/`, with the sign-in token and password removed.
