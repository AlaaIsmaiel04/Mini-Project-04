import { useState } from 'react';
import type { FormEvent } from 'react';
import type { OwnerPharmacy } from '@smartshelf/contracts';
import type { OwnerPharmacyService } from './owner-api';

export function PharmacistAccountForm({
  pharmacy,
  service,
}: {
  pharmacy: OwnerPharmacy;
  service: OwnerPharmacyService;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    setError('');
    setSuccess('');
    if (!email.trim() || !password.trim()) {
      setError('Enter an email address and an initial password.');
      return;
    }
    setPending(true);
    try {
      const user = await service.createPharmacist({
        email: email.trim().toLowerCase(),
        password,
        pharmacyId: pharmacy.id,
      });
      setSuccess(`Account ${user.email} was created for ${pharmacy.name}.`);
      setEmail('');
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to create the account.',
      );
    } finally {
      // Never retain the initial password after a request, including failed requests.
      setPassword('');
      setPending(false);
    }
  }

  return (
    <section aria-labelledby="account-heading">
      <h4 id="account-heading">Create pharmacist account</h4>
      <p>This account will be linked to {pharmacy.name} only.</p>
      <form className="owner-create-form" onSubmit={submit}>
        <fieldset disabled={pending}>
          <legend className="owner-visually-hidden">
            Pharmacist credentials
          </legend>
          <label htmlFor="pharmacist-email">
            Pharmacist email
            <input
              id="pharmacist-email"
              type="email"
              autoComplete="off"
              required
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setSuccess('');
              }}
            />
          </label>
          <label htmlFor="pharmacist-password">
            Initial password
            <input
              id="pharmacist-password"
              type="password"
              autoComplete="new-password"
              required
              value={password}
              onChange={(event) => {
                setPassword(event.target.value);
                setSuccess('');
              }}
            />
          </label>
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {success && (
          <p role="status" className="owner-success">
            {success}
          </p>
        )}
        <button type="submit" disabled={pending}>
          {pending ? 'Creating account…' : 'Create account'}
        </button>
      </form>
    </section>
  );
}
