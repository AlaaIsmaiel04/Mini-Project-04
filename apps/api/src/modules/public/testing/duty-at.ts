import 'dotenv/config';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

/**
 * Test only: never import this in a module. Answers "who is on duty at this moment?" from the
 * real AppModule, Prisma stores, mapper and database, with only the clock pinned, in its own
 * process on a port nobody else uses. The running API keeps the real time.
 *
 * From apps/api, after a build:
 *   npx tsx src/modules/public/testing/duty-at.ts 2026-12-21T02:00:00+03:00 2026-12-21T09:00:00+03:00
 */
async function main(): Promise<void> {
  const instants = process.argv.slice(2);
  if (!instants.length || instants.some((text) => isNaN(Date.parse(text)))) {
    throw new Error('Give one or more times with an offset.');
  }

  const { AppModule } = require('../../../../dist/app.module');
  const { CLOCK } = require('../../../../dist/modules/pharmacy/clock');
  let current = new Date(instants[0]);

  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.get(CLOCK, { strict: false }).now = () => new Date(current);
  await app.listen(0, '127.0.0.1');
  const url = await app.getUrl();

  try {
    for (const instant of instants) {
      current = new Date(instant);
      const response = await fetch(`${url}/api/public/pharmacies`);
      const { items } = await response.json();
      const onDuty = items
        .filter((item: { onDutyNow: boolean }) => item.onDutyNow)
        .map((item: { name: string }) => item.name);

      console.log(`\nAt ${instant}`);
      console.log(`On duty: ${onDuty.join(', ') || 'nobody'}`);
      console.log(JSON.stringify(items, null, 2));
    }
  } finally {
    await app.close();
  }
}

main().catch((error: Error) => {
  console.error(error.message);
  process.exitCode = 1;
});
