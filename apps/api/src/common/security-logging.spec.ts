import 'reflect-metadata';
import assert from 'node:assert/strict';
import { test, mock } from 'node:test';
import { Logger, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { PrismaService } from '../prisma/prisma.service';
import {
  ActiveSubscriptionGuard,
  OwnershipGuard,
  RolesGuard,
  type Actor,
} from './security';
import { InventoryService } from '../modules/inventory/inventory.service';

test('rejected access logs safe context and preserves HTTP errors', async () => {
  const entries: Record<string, unknown>[] = [];
  const warning = mock.method(Logger.prototype, 'warn', (message: string) => {
    entries.push(JSON.parse(message));
  });
  const actor: Actor = {
    id: '11111111-1111-4111-8111-111111111111',
    email: 'private@example.com',
    role: 'PHARMACIST',
    pharmacyId: '22222222-2222-4222-8222-222222222222',
  };
  const id = '33333333-3333-4333-8333-333333333333';
  const request = {
    actor,
    params: { id },
    headers: { authorization: 'Bearer private-token' },
    body: { password: 'private-password' },
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
    getHandler: () => null,
    getClass: () => null,
  } as unknown as ExecutionContext;
  try {
    const roles = new RolesGuard({
      getAllAndOverride: () => ['OWNER'],
    } as unknown as Reflector);
    assert.throws(() => roles.canActivate(context), ForbiddenException);
    assert.equal(entries.at(-1)?.reason, 'wrong_role');

    const ownership = new OwnershipGuard(
      { getAllAndOverride: () => 'medicine' } as unknown as Reflector,
      { medicine: { findFirst: async () => null } } as unknown as PrismaService,
    );
    await assert.rejects(ownership.canActivate(context), NotFoundException);
    assert.equal(entries.at(-1)?.reason, 'resource_not_owned_or_missing');
    assert.equal(entries.at(-1)?.resourceId, id);

    const inactive = new ActiveSubscriptionGuard({
      pharmacy: { findUnique: async () => ({ subscription: null }) },
    } as unknown as PrismaService);
    await assert.rejects(inactive.canActivate(context), ForbiddenException);
    assert.equal(entries.at(-1)?.subscriptionStatus, 'NONE');

    // A direct service call must also log the transactional subscription rejection.
    const tx = {
      pharmacy: { findUnique: async () => ({ subscription: null }) },
    };
    const service = new InventoryService({
      $transaction: async (action: (client: unknown) => Promise<unknown>) =>
        action(tx),
    } as unknown as PrismaService);
    await assert.rejects(
      service.createMedicine(actor, {
        displayName: 'Private medicine',
        scientificName: 'Private scientific',
        category: 'Private category',
        reorderThreshold: 0,
      }),
      ForbiddenException,
    );
    assert.equal(entries.at(-1)?.reason, 'inactive_subscription');
    assert.equal(entries.length, 4);
    for (const entry of entries) {
      assert.equal(entry.event, 'access_rejected');
      assert.equal(entry.actorId, actor.id);
      assert.equal(entry.pharmacyId, actor.pharmacyId);
      assert.ok(!JSON.stringify(entry).includes('private'));
      assert.ok(!JSON.stringify(entry).includes('Private'));
    }
  } finally {
    warning.mock.restore();
  }
});
