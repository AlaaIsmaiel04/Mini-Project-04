# Presentation notes

About 2 minutes. Say the plain text out loud. Lines in italics tell you what to do, and the step numbers are from [DEMO.md](DEMO.md). Prepare first: be signed in, with Swagger open.

## 1. Who I am and what I built

Hello, I am Hamid. I built the duty schedule for pharmacists, and the public search that citizens use without an account.

## 2. Overnight intervals

_Run Step 3: the overnight period._

A pharmacy is often on duty at night, so a duty period can cross midnight. Here I create one from eight in the evening until eight the next morning. I send Jordan time, and the server answers in UTC, so the time is always clear.

The start time counts as on duty, but the end time does not. We call this half-open.

_Show the Part B answers in the second window._

So at two in the morning this pharmacy is on duty. At nine it is not. At exactly eight, the period is already over.

## 3. The rejected overlap

_Run Step 4: the overlapping period._

Now I try a period that starts at two in the morning, inside the first one. The server answers 409, conflict, and nothing is saved. A new period may start exactly when another one ends. Even two requests at the same moment cannot both succeed, because each one first locks that pharmacy's row in the database.

## 4. Eligible stock

_Run Step 6: `panadol`._

Now I am a citizen. No sign-in. I search for Panadol. Four pharmacies have it, but I only see one, because the others do not have an active subscription.

_Run Step 8: `ibuprofen`._

This pharmacy does have Ibuprofen, but one batch has expired and the other is empty. A pharmacy appears only if one batch has units and has not expired.

## 5. Why quantities stay private

_Run Step 16: open the privacy example._

Look at the answer. There is a name, an address, a phone number and the duty times. There is no quantity, no price and no ID. A citizen only needs to know where to go. The exact stock is the pharmacy's private business information. We copy each public field by name, so a new database column can never reach a citizen by accident.

Thank you.
