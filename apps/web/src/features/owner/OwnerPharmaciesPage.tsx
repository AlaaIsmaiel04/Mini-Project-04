import { useLanguage } from '../preferences/LanguageProvider';
import type { MessageValue } from '../../locales/messages';
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
  const { accessToken, invalidateSession } = useAuth();
  // Keep the service stable while the current session is unchanged.
  const service = useMemo(
    () => createOwnerPharmacyService(accessToken ?? '', invalidateSession),
    [accessToken, invalidateSession],
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
  const { t, translateMessage } = useLanguage();
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
  const [success, setSuccess] = useState<MessageValue>('');
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
      setSuccess({
        key: '{name} was created successfully. Search and status filters have been cleared.',
        params: { name: pharmacy.name },
      });
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
        <h2>{t('Pharmacy management')}</h2>
        <p>{t('Find registered pharmacies and add a new pharmacy.')}</p>
      </header>

      <section className="owner-directory" aria-labelledby="pharmacies-heading">
        <h3 id="pharmacies-heading">{t('Pharmacies')}</h3>
        <form className="owner-filters" onSubmit={applyFilters}>
          <label htmlFor="pharmacy-search">
            {t('Search by name')}
            <input
              id="pharmacy-search"
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={t('Pharmacy name')}
            />
          </label>
          <label htmlFor="pharmacy-status">
            {t('Subscription status')}
            <select
              id="pharmacy-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as SubscriptionStatus | '')
              }
            >
              <option value="">{t('All statuses')}</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {translateMessage(label)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">{t('Search')}</button>
          <button
            type="button"
            className="owner-secondary"
            onClick={() => {
              setSearch('');
              setStatus('');
              setFilters({});
            }}
          >
            {t('Clear filters')}
          </button>
        </form>

        <div aria-busy={loading}>
          {loading && <p role="status">{t('Loading pharmacies…')}</p>}
          {listError && (
            <div role="alert" className="form-error">
              <p>{translateMessage(listError)}</p>
              <button
                type="button"
                className="owner-secondary"
                onClick={() => setRevision((value) => value + 1)}
              >
                {t('Retry')}
              </button>
            </div>
          )}
          {result && (
            <>
              <p role="status">
                {t(
                  result.total === 1
                    ? '{count} pharmacy found'
                    : '{count} pharmacies found',
                  { count: result.total },
                )}
              </p>
              {result.items.length === 0 ? (
                <p>
                  {filters.q || filters.status
                    ? t(
                        'No pharmacies match these filters. Try another name or status.',
                      )
                    : t('No pharmacies yet. Add your first pharmacy below.')}
                </p>
              ) : (
                <ul className="owner-pharmacy-list">
                  <li className="owner-table-head" aria-hidden="true">
                    <span>{t('Pharmacy')}</span>
                    <span>{t('Area')}</span>
                    <span>{t('Address')}</span>
                    <span>{t('Phone')}</span>
                    <span>{t('Subscription')}</span>
                    <span>{t('Action')}</span>
                  </li>
                  {result.items.map((pharmacy) => (
                    <li key={pharmacy.id} className="owner-pharmacy">
                      <div className="owner-pharmacy-heading">
                        <h4>{pharmacy.name}</h4>
                        <span
                          className={`owner-badge owner-badge-${pharmacy.subscriptionStatus.toLowerCase()}`}
                        >
                          {translateMessage(
                            statusLabels[pharmacy.subscriptionStatus],
                          )}
                        </span>
                      </div>
                      <dl>
                        <div>
                          <dt>{t('Area')}</dt>
                          <dd>{pharmacy.area}</dd>
                        </div>
                        <div>
                          <dt>{t('Address')}</dt>
                          <dd>{pharmacy.address}</dd>
                        </div>
                        <div>
                          <dt>{t('Phone')}</dt>
                          <dd dir="ltr">{pharmacy.phone}</dd>
                        </div>
                      </dl>
                      <button
                        type="button"
                        className="owner-secondary"
                        onClick={() => setSelectedId(pharmacy.id)}
                        aria-label={t('Manage {name}', { name: pharmacy.name })}
                      >
                        {t('Manage pharmacy')}
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
            {t('Close pharmacy management')}
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
        <h3 id="create-pharmacy-heading">{t('Add pharmacy')}</h3>
        <p>{t('New pharmacies start without a subscription.')}</p>
        <form className="owner-create-form" onSubmit={createPharmacy}>
          <fieldset disabled={creating}>
            <legend className="owner-visually-hidden">
              {t('New pharmacy details')}
            </legend>
            {(['name', 'area', 'address', 'phone'] as const).map((field) => (
              <label key={field} htmlFor={`new-pharmacy-${field}`}>
                {t(
                  (
                    {
                      name: 'Pharmacy name',
                      area: 'Area',
                      address: 'Address',
                      phone: 'Phone',
                    } as const
                  )[field],
                )}
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
              {translateMessage(formError)}
            </p>
          )}
          <button type="submit" disabled={creating}>
            {creating ? t('Creating…') : t('Create pharmacy')}
          </button>
          {success && (
            <p className="owner-success" role="status">
              {translateMessage(success)}
            </p>
          )}
        </form>
      </section>
    </div>
  );
}
