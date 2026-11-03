import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  CreatePharmacyInput,
  ListResponse,
  OwnerPharmacy,
  OwnerPharmacyFilters,
  SubscriptionStatus,
} from '@smartshelf/contracts';
import { useAuth } from '../auth/AuthProvider';
import { createOwnerPharmacyService } from './owner-api';
import type { OwnerPharmacyService } from './owner-api';
import './owner.css';
import {
  OwnerPharmacyManagement,
  OwnerSubscriptionRoute,
} from './OwnerPharmacyManagement';
import { useParams } from 'react-router-dom';

const statusLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
  NONE: 'No subscription',
};
const emptyForm: CreatePharmacyInput = {
  name: '',
  area: '',
  address: '',
  phone: '',
};

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to complete the request. Please try again.';
}

export function OwnerPharmaciesPage() {
  const { pharmacyId } = useParams();
  const { accessToken, signOut } = useAuth();
  // Keep the service stable while the current session is unchanged.
  const service = useMemo(
    () => createOwnerPharmacyService(accessToken ?? '', signOut),
    [accessToken, signOut],
  );
  return pharmacyId ? (
    <OwnerSubscriptionRoute service={service} />
  ) : (
    <OwnerPharmaciesView service={service} />
  );
}

// A service boundary lets local previews exercise this same UI without fake login.
export function OwnerPharmaciesView({
  service,
}: {
  service: OwnerPharmacyService;
}) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<SubscriptionStatus | ''>('');
  const [filters, setFilters] = useState<OwnerPharmacyFilters>({});
  const [result, setResult] = useState<ListResponse<OwnerPharmacy> | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [revision, setRevision] = useState(0);
  const [form, setForm] = useState<CreatePharmacyInput>(emptyForm);
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setListError('');
    setResult(null);
    service.list(filters, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult(data);
          setLoading(false);
        }
      },
      (error: unknown) => {
        if (!controller.signal.aborted) {
          setListError(errorMessage(error));
          setLoading(false);
        }
      },
    );
    return () => controller.abort();
  }, [service, filters, revision]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ q: search.trim() || undefined, status: status || undefined });
  }

  async function createPharmacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (creating) return;
    setFormError('');
    setSuccess('');
    const input: CreatePharmacyInput = {
      name: form.name.trim(),
      area: form.area.trim(),
      address: form.address.trim(),
      phone: form.phone.trim(),
    };
    if (Object.values(input).some((value) => !value)) {
      setFormError(
        'Enter a name, area, address and phone number. Spaces alone are not valid.',
      );
      return;
    }
    setCreating(true);
    try {
      const pharmacy = await service.create(input);
      setForm(emptyForm);
      setSuccess(
        `${pharmacy.name} was created successfully. Search and status filters have been cleared.`,
      );
      // Clear filters so the newly created pharmacy (without a subscription) is visible.
      setSearch('');
      setStatus('');
      setFilters({});
    } catch (error) {
      setFormError(errorMessage(error));
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="owner-page">
      <header className="owner-heading">
        <h2>Pharmacy management</h2>
        <p>Find registered pharmacies and add a new pharmacy.</p>
      </header>

      <section className="owner-panel" aria-labelledby="pharmacies-heading">
        <h3 id="pharmacies-heading">Pharmacies</h3>
        <form className="owner-filters" onSubmit={applyFilters}>
          <label htmlFor="pharmacy-search">
            Search by name
            <input
              id="pharmacy-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Pharmacy name"
            />
          </label>
          <label htmlFor="pharmacy-status">
            Subscription status
            <select
              id="pharmacy-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as SubscriptionStatus | '')
              }
            >
              <option value="">All statuses</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Search</button>
          <button
            type="button"
            className="owner-secondary"
            onClick={() => {
              setSearch('');
              setStatus('');
              setFilters({});
            }}
          >
            Clear filters
          </button>
        </form>

        <div aria-busy={loading}>
          {loading && <p role="status">Loading pharmacies…</p>}
          {listError && (
            <div role="alert" className="form-error">
              <p>{listError}</p>
              <button
                type="button"
                className="owner-secondary"
                onClick={() => setRevision((value) => value + 1)}
              >
                Retry
              </button>
            </div>
          )}
          {result && (
            <>
              <p role="status">
                {result.total} {result.total === 1 ? 'pharmacy' : 'pharmacies'}{' '}
                found
              </p>
              {result.items.length === 0 ? (
                <p>
                  {filters.q || filters.status
                    ? 'No pharmacies match these filters. Try another name or status.'
                    : 'No pharmacies yet. Add your first pharmacy below.'}
                </p>
              ) : (
                <ul className="owner-pharmacy-list">
                  {result.items.map((pharmacy) => (
                    <li key={pharmacy.id} className="owner-pharmacy">
                      <div className="owner-pharmacy-heading">
                        <h4>{pharmacy.name}</h4>
                        <span
                          className={`owner-badge owner-badge-${pharmacy.subscriptionStatus.toLowerCase()}`}
                        >
                          {statusLabels[pharmacy.subscriptionStatus]}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>Area</dt>
                          <dd>{pharmacy.area}</dd>
                        </div>
                        <div>
                          <dt>Address</dt>
                          <dd>{pharmacy.address}</dd>
                        </div>
                        <div>
                          <dt>Phone</dt>
                          <dd>{pharmacy.phone}</dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        className="owner-secondary"
                        onClick={() => setSelectedId(pharmacy.id)}
                        aria-label={`Manage ${pharmacy.name}`}
                      >
                        Manage pharmacy
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
        </div>
      </section>

      {selectedId && (
        <>
          <button
            type="button"
            className="owner-secondary"
            onClick={() => setSelectedId(null)}
          >
            Close pharmacy management
          </button>
          <OwnerPharmacyManagement
            key={selectedId}
            pharmacyId={selectedId}
            service={service}
            onChanged={() => setRevision((value) => value + 1)}
          />
        </>
      )}

      <section
        className="owner-panel"
        aria-labelledby="create-pharmacy-heading"
      >
        <h3 id="create-pharmacy-heading">Add pharmacy</h3>
        <p>New pharmacies start without a subscription.</p>
        <form className="owner-create-form" onSubmit={createPharmacy}>
          <fieldset disabled={creating}>
            <legend className="owner-visually-hidden">
              New pharmacy details
            </legend>
            {(['name', 'area', 'address', 'phone'] as const).map((field) => (
              <label key={field} htmlFor={`new-pharmacy-${field}`}>
                {field === 'name'
                  ? 'Pharmacy name'
                  : field.charAt(0).toUpperCase() + field.slice(1)}
                <input
                  id={`new-pharmacy-${field}`}
                  name={field}
                  type={field === 'phone' ? 'tel' : 'text'}
                  required
                  value={form[field]}
                  onChange={(event) => {
                    setForm({ ...form, [field]: event.target.value });
                    setSuccess('');
                  }}
                />
              </label>
            ))}
          </fieldset>
          {formError && (
            <p className="form-error" role="alert">
              {formError}
            </p>
          )}
          <button type="submit" disabled={creating}>
            {creating ? 'Creating…' : 'Create pharmacy'}
          </button>
          {success && (
            <p className="owner-success" role="status">
              {success}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
