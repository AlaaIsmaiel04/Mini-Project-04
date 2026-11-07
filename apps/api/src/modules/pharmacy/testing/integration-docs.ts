import assert from 'node:assert/strict';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import {
  type INestApplication,
  type Type,
  ValidationPipe,
} from '@nestjs/common';
import { NestFactory } from '@nestjs/core';

// Test only: helpers for the specs that generate the INTEGRATION.md guides.

// The same setup as main.ts.
function configureLikeMain(app: INestApplication): void {
  app.setGlobalPrefix('api');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
}

export interface Exchange {
  method: string;
  path: string;
  requestBody?: unknown;
  status: number;
  responseText: string;
}

/** Sends real requests, and fails if the API stops answering with the expected status. */
function requester(baseUrl: string) {
  return async (
    expectedStatus: number,
    method: string,
    path: string,
    requestBody?: unknown,
    authorization: string | null = 'Bearer example-token',
  ): Promise<Exchange> => {
    const response = await fetch(`${baseUrl}${path}`, {
      method,
      headers: {
        'Content-Type': 'application/json',
        ...(authorization ? { Authorization: authorization } : {}),
      },
      body: requestBody === undefined ? undefined : JSON.stringify(requestBody),
    });
    const responseText = await response.text();

    assert.equal(
      response.status,
      expectedStatus,
      `${method} ${path} answered: ${responseText}`,
    );
    return {
      method,
      path,
      requestBody,
      status: response.status,
      responseText,
    };
  };
}

/** A Prisma client whose database is down: every query fails, as in the running API. */
export const unreachablePrisma = () =>
  new Proxy(
    {},
    {
      get: () =>
        new Proxy(
          {},
          {
            get: () => () =>
              Promise.reject(new Error("Can't reach database server")),
          },
        ),
    },
  );

/**
 * Runs the app only while `capture` runs. The app closes even when a request gets the
 * wrong status, because a server left open makes the test run hang instead of fail.
 */
export async function withRunningApp<T>(
  module: Type<unknown>,
  capture: (api: ReturnType<typeof requester>) => Promise<T>,
): Promise<T> {
  const app = await NestFactory.create(module, { logger: false });
  try {
    configureLikeMain(app);
    await app.listen(0, '127.0.0.1');
    return await capture(requester(await app.getUrl()));
  } finally {
    await app.close();
  }
}

export const responseJson = (exchange: Exchange) =>
  JSON.parse(exchange.responseText);

const jsonBlock = (value: unknown) =>
  ['```json', JSON.stringify(value, null, 2), '```'].join('\n');

export const codeBlock = (language: string, code: string) =>
  ['```' + language, code, '```'].join('\n');

export function renderExchange({
  method,
  path,
  requestBody,
  status,
  responseText,
}: Exchange): string {
  return [
    `\`${method} ${path}\``,
    ...(requestBody === undefined ? [] : [jsonBlock(requestBody)]),
    `Response: **${status}**${responseText ? '' : ', with no body'}`,
    ...(responseText ? [jsonBlock(JSON.parse(responseText))] : []),
  ].join('\n\n');
}

/**
 * Fails when the guide on disk differs from what the code produces now. With
 * UPDATE_INTEGRATION_DOCS=1 it writes the guide instead, after an intended change.
 */
export function assertGuideIsCurrent(path: string, generated: string): void {
  if (process.env.UPDATE_INTEGRATION_DOCS === '1') {
    writeFileSync(path, generated);
    return;
  }

  // A Windows checkout may have converted the line endings.
  const onDisk = existsSync(path)
    ? readFileSync(path, 'utf8').replace(/\r\n/g, '\n')
    : '';
  if (onDisk === generated) return;

  const generatedLines = generated.split('\n');
  const onDiskLines = onDisk.split('\n');
  const firstDifference = generatedLines.findIndex(
    (line, index) => line !== onDiskLines[index],
  );
  assert.fail(
    [
      `${path} no longer matches what the code produces.`,
      `First difference at line ${firstDifference + 1}:`,
      `  file: ${onDiskLines[firstDifference]}`,
      `  code: ${generatedLines[firstDifference]}`,
      'If the change is intended, regenerate the guide and commit the result:',
      '  bash: UPDATE_INTEGRATION_DOCS=1 npm test',
      "  PowerShell: $env:UPDATE_INTEGRATION_DOCS='1'; npm test; Remove-Item Env:UPDATE_INTEGRATION_DOCS",
    ].join('\n'),
  );
}
