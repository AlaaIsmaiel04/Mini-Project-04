# Independent laptop startup check

**Status: not performed.** This sheet must be completed by another team member on their own laptop. Alaa's isolated database checks do not satisfy this gate.

Use [LOCAL-SETUP.md](LOCAL-SETUP.md) and the README as the actual setup instructions. Preserve any existing local configuration and use a separate demo database. Do not share or commit `.env` files or database credentials.

| Item                                                                         | Result / evidence |
| ---------------------------------------------------------------------------- | ----------------- |
| Member, date, operating system                                               | Pending           |
| Checked-out commit (`git rev-parse HEAD`)                                    | Pending           |
| Node/npm/PostgreSQL versions                                                 | Pending           |
| Fresh clone and `npm ci`                                                     | Pending           |
| Local `.env` files created from examples and configured privately            | Pending           |
| `npm run db:generate`                                                        | Pending           |
| `npm run db:deploy` against that laptop's demo database                      | Pending           |
| Demo seed, explicitly enabled for that database; repeated without duplicates | Pending           |
| `npm run typecheck`, `npm test`, `npm run build`                             | Pending           |
| `npm run smoke`                                                              | Pending           |
| `npm run test:integration` against a separate test database                  | Pending           |
| `npm run dev`, homepage, sign-in, inventory, dashboard and public search     | Pending           |
| Light/Dark/System and English/Arabic keyboard/mobile checks                  | Pending           |
| Data survives backend restart                                                | Pending           |
| Working tree contains no accidental environment/dependency/build files       | Pending           |

Record error messages with passwords/tokens/connection strings removed. Include the fix or assigned owner for any failed step. Real owner administration remains blocked until Shiam's backend merges; report that limitation rather than substituting preview results. Stop the development servers after the check.
