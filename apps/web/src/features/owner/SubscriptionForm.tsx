import { useState } from 'react';
import type { FormEvent } from 'react';
import type { OwnerPharmacy, SubscriptionInput } from '@smartshelf/contracts';
import type { OwnerPharmacyService } from './owner-api';

function validDate(value: string) {
  return (
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(`${value}T00:00:00Z`)) &&
    new Date(`${value}T00:00:00Z`).toISOString().slice(0, 10) === value
  );
}

export function SubscriptionForm({
  pharmacy,
  service,
  onSaved,
}: {
  pharmacy: OwnerPharmacy;
  service: OwnerPharmacyService;
  onSaved: (message: string) => void;
}) {
  const subscription = pharmacy.subscription;
  const [input, setInput] = useState<SubscriptionInput>({
    startDate: subscription?.startDate ?? '',
    endDate: subscription?.endDate ?? '',
    suspended: subscription?.suspended ?? false,
  });
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');

  async function save(value: SubscriptionInput, message: string) {
    if (pending) return;
    setError('');
    if (
      !validDate(value.startDate) ||
      !validDate(value.endDate) ||
      value.startDate >= value.endDate
    ) {
      setError('Enter valid dates. The end date must be after the start date.');
      return;
    }
    setPending(true);
    try {
      await service.saveSubscription(pharmacy.id, value, subscription !== null);
      onSaved(message);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to save the subscription.',
      );
    } finally {
      setPending(false);
    }
  }

  async function remove() {
    if (pending || !subscription) return;
    if (
      !window.confirm(
        `Delete the subscription for ${pharmacy.name}? The pharmacy, pharmacist accounts, inventory and duty records will be kept.`,
      )
    )
      return;
    setError('');
    setPending(true);
    try {
      await service.deleteSubscription(pharmacy.id);
      onSaved(
        'Subscription deleted. The pharmacy and its other data have been kept.',
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to delete the subscription.',
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="subscription-heading">
      <h4 id="subscription-heading">
        {subscription ? 'Edit subscription' : 'Create subscription'}
      </h4>
      <p>
        Dates include both the start and end day. Reactivating removes
        suspension; expired or future dates may still prevent an active
        subscription.
      </p>
      <form
        className="owner-create-form"
        onSubmit={(event: FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          void save(input, 'Subscription saved.');
        }}
      >
        <fieldset disabled={pending}>
          <legend className="owner-visually-hidden">
            Subscription details
          </legend>
          <label htmlFor="subscription-start">
            Start date
            <input
              id="subscription-start"
              type="date"
              required
              value={input.startDate}
              onChange={(event) =>
                setInput({ ...input, startDate: event.target.value })
              }
            />
          </label>
          <label htmlFor="subscription-end">
            End date
            <input
              id="subscription-end"
              type="date"
              required
              value={input.endDate}
              onChange={(event) =>
                setInput({ ...input, endDate: event.target.value })
              }
            />
          </label>
          <label className="owner-checkbox" htmlFor="subscription-suspended">
            <input
              id="subscription-suspended"
              type="checkbox"
              checked={input.suspended}
              onChange={(event) =>
                setInput({ ...input, suspended: event.target.checked })
              }
            />
            Suspended
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        <div className="owner-actions">
          <button type="submit" disabled={pending}>
            {pending
              ? 'Saving…'
              : subscription
                ? 'Save subscription'
                : 'Create subscription'}
          </button>
          {subscription && (
            <>
              <button
                type="button"
                className="owner-secondary"
                disabled={pending}
                onClick={() =>
                  void save(
                    {
                      startDate: subscription.startDate,
                      endDate: subscription.endDate,
                      suspended: !subscription.suspended,
                    },
                    subscription.suspended
                      ? 'Suspension removed. Check the refreshed subscription status.'
                      : 'Subscription suspended.',
                  )
                }
              >
                {subscription.suspended
                  ? 'Reactivate subscription'
                  : 'Suspend subscription'}
              </button>
              <button
                type="button"
                className="owner-danger"
                disabled={pending}
                onClick={() => void remove()}
              >
                Delete subscription
              </button>
            </>
          )}
        </div>
        {subscription && (
          <p>
            Quick suspend/reactivate uses the saved dates. Use Save subscription
            to apply edited dates.
          </p>
        )}
      </form>
    </section>
  );
}
