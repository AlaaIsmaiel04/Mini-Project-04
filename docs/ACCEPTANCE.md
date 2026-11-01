# Core acceptance checklist

After implementation, run against real endpoints with the team-authored PostgreSQL seed. The foundation implements none of these feature scenarios; members must build them. API owners automate meaningful rule tests; Alaa coordinates the final full-flow demo. Freeze the test clock for date boundaries.

| ID  | Required scenario                                                                                                                          | Main owner                |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------- |
| A01 | Missing/invalid/expired token -> 401; wrong role -> 403; no secrets in responses/logs                                                      | Mustafa                   |
| A02 | Pharmacist A cannot read/change B's medicine, batch or duty by guessed UUID; owner cannot edit inventory                                   | Mustafa + Hamid           |
| A03 | Owner creates pharmacy/account/subscription; duplicate email and nonexistent pharmacy rejected                                             | Shiam                     |
| A04 | Subscription inclusive dates, future NONE, expired EXPIRED, suspension precedence; second subscription and end<=start rejected             | Shiam                     |
| A05 | Inactive pharmacist may read own views, but all medicine/batch/profile/duty changes -> 403 with reason                                     | All API owners            |
| A06 | Delete subscription only; preserve pharmacy/users/medicines/batches/duty; NONE and no public listing afterward                             | Shiam + Hamid             |
| A07 | Medicine names unique per pharmacy ignoring trim/case; batch number unique per medicine; conflicts -> 409                                  | Mustafa                   |
| A08 | Negative/fractional quantities, negative threshold/cost, invalid dates/UUID/query enums and unknown fields rejected; expired batch allowed | All API owners            |
| A09 | Expiry yesterday=EXPIRED; today/+90=EXPIRING_SOON; +91 neither; available units exclude expired                                            | Mohammad                  |
| A10 | Quantity==threshold LOW_STOCK; low+expiring shows and filters under both; nonempty expired batch prevents HEALTHY                          | Mohammad + Mustafa + Alaa |
| A11 | 10 units x 2.50 nonexpired + 3 x 4.00 expired -> inventory 25.00, waste 12.00, available units 10                                          | Mohammad                  |
| A12 | Medicine/batch change and inventoryUpdatedAt commit together; failed mutations change neither                                              | Mustafa                   |
| A13 | Overnight includes 02:00, excludes end instant; end<=start/>24h/overlap rejected; adjacent allowed; concurrent overlap prevented           | Hamid                     |
| A14 | Combined name/area/duty search; inactive/expired-only/zero-only stock excluded; partial/case-insensitive scientific name works             | Hamid + Yousef            |
| A15 | ACTIVE-only directory with current/next duty; exact public allowlist, including nested periods                                             | Hamid                     |
| A16 | Every screen loading/empty/error, visible server validation, inactive read-only banner, multi-badges, mutation refresh                     | Frontend owners           |
| A17 | Restart retains data; clean migration/seed work; Swagger documents all endpoints/auth                                                      | Mustafa + API owners      |
| A18 | Every member presents in English and explains architecture, a business rule, one rejection and one decision                                | Everyone                  |

Complete CORE before optional FEFO/history/dispensing or configurable expiry. No public hosting, orders, reservations or payments.
