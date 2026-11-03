import { useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  BatchIndicator,
  Indicator,
  InventoryFilters,
  InventoryResponse,
  SubscriptionStatus,
} from '@smartshelf/contracts';
import { useAuth } from '../auth/AuthProvider';
import { createInventoryService } from './inventory-api';
import type { InventoryService } from './inventory-api';
import './inventory.css';

const indicatorLabels: Record<Indicator, string> = {
  HEALTHY: 'Healthy',
  EXPIRING_SOON: 'Expiring soon',
  LOW_STOCK: 'Low stock',
  EXPIRED: 'Expired',
};
const subscriptionLabels: Record<SubscriptionStatus, string> = {
  ACTIVE: 'Active',
  EXPIRED: 'Expired',
  SUSPENDED: 'Suspended',
  NONE: 'No active subscription',
};

function Indicators({ values }: { values: (Indicator | BatchIndicator)[] }) {
  return (
    <ul className="inventory-badges" aria-label="Indicators">
      {values.map((value) => (
        <li
          key={value}
          className={`inventory-badge inventory-badge-${value.toLowerCase()}`}
        >
          {indicatorLabels[value]}
        </li>
      ))}
    </ul>
  );
}

export function InventoryPage() {
  const { accessToken, signOut } = useAuth();
  const service = useMemo(
    () => createInventoryService(accessToken ?? '', signOut),
    [accessToken, signOut],
  );
  return <InventoryView service={service} />;
}

export function InventoryView({ service }: { service: InventoryService }) {
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Indicator | ''>('');
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [result, setResult] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setResult(null);
    service.list(filters, controller.signal).then(
      (data) => {
        if (!controller.signal.aborted) {
          setResult(data);
          setLoading(false);
        }
      },
      (reason) => {
        if (!controller.signal.aborted) {
          setError(
            reason instanceof Error
              ? reason.message
              : 'Unable to load inventory. Please try again.',
          );
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

  return (
    <div className="inventory-page">
      <header>
        <h2>Medicine inventory</h2>
        <p>
          Search your medicines and review stock, expiry indicators and batch
          details.
        </p>
      </header>
      <section
        className="inventory-panel"
        aria-labelledby="inventory-filter-heading"
      >
        <h3 id="inventory-filter-heading">Find medicines</h3>
        <form className="inventory-filters" onSubmit={applyFilters}>
          <label htmlFor="inventory-search">
            Medicine name
            <input
              id="inventory-search"
              type="search"
              placeholder="Display or scientific name"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label htmlFor="inventory-status">
            Indicator
            <select
              id="inventory-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as Indicator | '')
              }
            >
              <option value="">All indicators</option>
              {Object.entries(indicatorLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">Search inventory</button>
          <button
            type="button"
            className="inventory-secondary"
            onClick={() => {
              setSearch('');
              setStatus('');
              setFilters({});
            }}
          >
            Clear filters
          </button>
        </form>
      </section>
      <div aria-busy={loading}>
        {loading && <p role="status">Loading inventory…</p>}
        {error && (
          <div className="form-error" role="alert">
            <p>{error}</p>
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              Retry inventory
            </button>
          </div>
        )}
        {result && (
          <>
            <p>
              Subscription:{' '}
              <strong>{subscriptionLabels[result.subscriptionStatus]}</strong>
            </p>
            {result.subscriptionStatus !== 'ACTIVE' && (
              <aside className="inventory-readonly" role="status">
                <strong>Read-only inventory</strong>
                <p>
                  Your pharmacy's subscription is{' '}
                  {subscriptionLabels[result.subscriptionStatus].toLowerCase()}.
                  You can view and search your inventory, but cannot add or
                  change medicines or batches. Contact the owner to activate
                  your subscription.
                </p>
              </aside>
            )}
            <p role="status">
              {result.items.length}{' '}
              {result.items.length === 1 ? 'medicine' : 'medicines'} shown
              {result.total !== result.items.length &&
                ` (${result.total} matching in total)`}
            </p>
            {result.items.length === 0 ? (
              <p>
                {filters.q || filters.status
                  ? 'No medicines match these filters. Try another name or indicator.'
                  : 'No medicines in your inventory yet.'}
              </p>
            ) : (
              <ul className="inventory-medicines">
                {result.items.map((medicine) => (
                  <li key={medicine.id}>
                    <article
                      className="inventory-panel"
                      aria-labelledby={`medicine-${medicine.id}`}
                    >
                      <h3 id={`medicine-${medicine.id}`}>
                        {medicine.displayName}
                      </h3>
                      <p className="inventory-scientific">
                        {medicine.scientificName}
                      </p>
                      <Indicators values={medicine.indicators} />
                      <dl className="inventory-facts">
                        <div>
                          <dt>Category</dt>
                          <dd>{medicine.category}</dd>
                        </div>
                        <div>
                          <dt>Available quantity</dt>
                          <dd>{medicine.availableQuantity}</dd>
                        </div>
                        <div>
                          <dt>Reorder threshold</dt>
                          <dd>{medicine.reorderThreshold}</dd>
                        </div>
                      </dl>
                      <details className="inventory-batches">
                        <summary>
                          Batch details ({medicine.batches.length})
                        </summary>
                        {medicine.batches.length === 0 ? (
                          <p>
                            No batches have been registered for this medicine.
                          </p>
                        ) : (
                          <ul className="inventory-batch-list">
                            {medicine.batches.map((batch) => (
                              <li key={batch.id}>
                                <h4>Batch {batch.batchNumber}</h4>
                                {batch.indicators.length > 0 && (
                                  <Indicators values={batch.indicators} />
                                )}
                                <dl className="inventory-facts">
                                  <div>
                                    <dt>Quantity</dt>
                                    <dd>{batch.quantity}</dd>
                                  </div>
                                  <div>
                                    <dt>Expiry date</dt>
                                    <dd>
                                      <time dateTime={batch.expiryDate}>
                                        {batch.expiryDate}
                                      </time>
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>Storage location</dt>
                                    <dd>{batch.storageLocation}</dd>
                                  </div>
                                  <div>
                                    <dt>Unit cost</dt>
                                    <dd>{batch.unitCost}</dd>
                                  </div>
                                  <div>
                                    <dt>Barcode</dt>
                                    <dd>{batch.barcode ?? 'Not provided'}</dd>
                                  </div>
                                </dl>
                              </li>
                            ))}
                          </ul>
                        )}
                      </details>
                    </article>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </div>
    </div>
  );
}
