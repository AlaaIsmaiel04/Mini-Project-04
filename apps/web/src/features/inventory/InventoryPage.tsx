import { useLanguage } from '../preferences/LanguageProvider';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
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
import { InventoryForm } from './InventoryForms';
import type { InventoryEditor } from './InventoryForms';
import {
  notifyInventoryChanged,
  useInventoryRevision,
} from '../../lib/inventory-updates';
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
  const { t, translateMessage } = useLanguage();
  return (
    <ul className="inventory-badges" aria-label={t('Indicators')}>
      {values.map((value) => (
        <li
          key={value}
          className={`inventory-badge inventory-badge-${value.toLowerCase()}`}
        >
          {translateMessage(indicatorLabels[value])}
        </li>
      ))}
    </ul>
  );
}

export function InventoryPage() {
  const { accessToken, invalidateSession } = useAuth();
  const service = useMemo(
    () => createInventoryService(accessToken ?? '', invalidateSession),
    [accessToken, invalidateSession],
  );
  return <InventoryView service={service} />;
}

export function InventoryView({ service }: { service: InventoryService }) {
  const { t, translateMessage } = useLanguage();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<Indicator | ''>('');
  const [filters, setFilters] = useState<InventoryFilters>({});
  const [result, setResult] = useState<InventoryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);
  const stockRevision = useInventoryRevision();
  const [editor, setEditor] = useState<InventoryEditor | null>(null);
  const [notice, setNotice] = useState('');
  const heading = useRef<HTMLHeadingElement>(null);
  const trigger = useRef<HTMLButtonElement | null>(null);
  const restoreFocus = useRef(false);
  const active = !loading && !error && result?.subscriptionStatus === 'ACTIVE';

  useEffect(() => {
    const refresh = () => setRevision((value) => value + 1);
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, []);

  function openEditor(value: InventoryEditor, button: HTMLButtonElement) {
    trigger.current = button;
    setNotice('');
    setEditor(value);
  }

  function closeEditor() {
    restoreFocus.current = true;
    setEditor(null);
  }

  useLayoutEffect(() => {
    if (!editor && restoreFocus.current) {
      restoreFocus.current = false;
      if (trigger.current?.isConnected && !trigger.current.disabled)
        trigger.current.focus();
      else heading.current?.focus();
    }
  }, [editor]);

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
  }, [service, filters, revision, stockRevision]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ q: search.trim() || undefined, status: status || undefined });
  }

  return (
    <div className="inventory-page">
      <header>
        <h2 ref={heading} tabIndex={-1}>
          {t('Medicine inventory')}
        </h2>
        <p>
          {t(
            'Search your medicines and review stock, expiry indicators and batch details.',
          )}
        </p>
      </header>
      {notice && (
        <p role="status" className="inventory-success">
          {translateMessage(notice)}
        </p>
      )}
      <div className="inventory-actions">
        <button
          type="button"
          disabled={!active || !!editor}
          onClick={(event) =>
            openEditor({ kind: 'medicine' }, event.currentTarget)
          }
        >
          {t('Add medicine')}
        </button>
        {!loading && result && result.subscriptionStatus !== 'ACTIVE' && (
          <span>
            {t('An active subscription is required to make changes.')}
          </span>
        )}
      </div>
      {editor && (
        <InventoryForm
          editor={editor}
          service={service}
          active={active}
          accessMessage={
            loading
              ? 'Checking whether changes are allowed.'
              : error
                ? 'Unable to verify access. Retry loading inventory before saving.'
                : 'Changes are unavailable because your subscription is not active.'
          }
          onCancel={closeEditor}
          onForbidden={() => setRevision((value) => value + 1)}
          onSaved={(message) => {
            closeEditor();
            setNotice(message);
            notifyInventoryChanged();
          }}
        />
      )}
      <section
        className="inventory-filters-panel"
        aria-labelledby="inventory-filter-heading"
      >
        <h3 id="inventory-filter-heading">{t('Find medicines')}</h3>
        <form className="inventory-filters" onSubmit={applyFilters}>
          <label htmlFor="inventory-search">
            {t('Medicine name')}
            <input
              id="inventory-search"
              type="search"
              placeholder={t('Display or scientific name')}
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </label>
          <label htmlFor="inventory-status">
            {t('Indicator')}
            <select
              id="inventory-status"
              value={status}
              onChange={(event) =>
                setStatus(event.target.value as Indicator | '')
              }
            >
              <option value="">{t('All indicators')}</option>
              {Object.entries(indicatorLabels).map(([value, label]) => (
                <option key={value} value={value}>
                  {translateMessage(label)}
                </option>
              ))}
            </select>
          </label>
          <button type="submit">{t('Search inventory')}</button>
          <button
            type="button"
            className="inventory-secondary"
            onClick={() => {
              setSearch('');
              setStatus('');
              setFilters({});
            }}
          >
            {t('Clear filters')}
          </button>
        </form>
      </section>
      <div aria-busy={loading}>
        {loading && <p role="status">{t('Loading inventory…')}</p>}
        {error && (
          <div className="form-error" role="alert">
            <p>{translateMessage(error)}</p>
            <button
              type="button"
              onClick={() => setRevision((value) => value + 1)}
            >
              {t('Retry inventory')}
            </button>
          </div>
        )}
        {result && (
          <>
            <p>
              {t('Subscription:')}{' '}
              <strong>
                {translateMessage(
                  subscriptionLabels[result.subscriptionStatus],
                )}
              </strong>
            </p>
            {result.subscriptionStatus !== 'ACTIVE' && (
              <aside className="inventory-readonly" role="status">
                <strong>{t('Read-only inventory')}</strong>
                <p>
                  {t(
                    "Your pharmacy's subscription is {status}. You can view and search your inventory, but cannot add or change medicines or batches. Contact the owner to activate your subscription.",
                    {
                      status: translateMessage(
                        subscriptionLabels[result.subscriptionStatus],
                      ).toLowerCase(),
                    },
                  )}
                </p>
              </aside>
            )}
            <p role="status">
              {t(
                result.items.length === 1
                  ? '{count} medicine shown'
                  : '{count} medicines shown',
                { count: result.items.length },
              )}
              {result.total !== result.items.length &&
                t(' ({count} matching in total)', { count: result.total })}
            </p>
            {result.items.length === 0 ? (
              <p>
                {filters.q || filters.status
                  ? t(
                      'No medicines match these filters. Try another name or indicator.',
                    )
                  : t('No medicines in your inventory yet.')}
              </p>
            ) : (
              <ul className="inventory-medicines">
                <li className="inventory-table-head" aria-hidden="true">
                  <span>{t('Medicine / scientific name')}</span>
                  <span>{t('Category')}</span>
                  <span>{t('Available')}</span>
                  <span>{t('Reorder at')}</span>
                  <span>{t('Indicators')}</span>
                  <span>{t('Actions')}</span>
                </li>
                {result.items.map((medicine) => (
                  <li key={medicine.id}>
                    <article
                      className="inventory-panel inventory-row"
                      aria-labelledby={`medicine-${medicine.id}`}
                    >
                      <div className="inventory-identity">
                        <h3 id={`medicine-${medicine.id}`} dir="ltr">
                          {medicine.displayName}
                        </h3>
                        <p className="inventory-scientific" dir="ltr">
                          {medicine.scientificName}
                        </p>
                      </div>
                      <div className="inventory-actions">
                        <button
                          type="button"
                          className="inventory-secondary"
                          disabled={!active || !!editor}
                          onClick={(event) =>
                            openEditor(
                              { kind: 'medicine', medicine },
                              event.currentTarget,
                            )
                          }
                        >
                          {t('Edit medicine')}
                        </button>
                        <button
                          type="button"
                          disabled={!active || !!editor}
                          onClick={(event) =>
                            openEditor(
                              { kind: 'batch', medicine },
                              event.currentTarget,
                            )
                          }
                        >
                          {t('Add batch')}
                        </button>
                      </div>
                      <Indicators values={medicine.indicators} />
                      <dl className="inventory-facts">
                        <div>
                          <dt>{t('Category')}</dt>
                          <dd>{medicine.category}</dd>
                        </div>
                        <div>
                          <dt>{t('Available quantity')}</dt>
                          <dd>{medicine.availableQuantity}</dd>
                        </div>
                        <div>
                          <dt>{t('Reorder threshold')}</dt>
                          <dd>{medicine.reorderThreshold}</dd>
                        </div>
                      </dl>
                      <details className="inventory-batches">
                        <summary>
                          {t('Batch details ({count})', {
                            count: medicine.batches.length,
                          })}
                        </summary>
                        {medicine.batches.length === 0 ? (
                          <p>
                            {t(
                              'No batches have been registered for this medicine.',
                            )}
                          </p>
                        ) : (
                          <ul className="inventory-batch-list">
                            {medicine.batches.map((batch) => (
                              <li key={batch.id}>
                                <h4>
                                  {t('Batch')}{' '}
                                  <bdi dir="ltr">{batch.batchNumber}</bdi>
                                </h4>
                                <button
                                  type="button"
                                  className="inventory-secondary"
                                  disabled={!active || !!editor}
                                  onClick={(event) =>
                                    openEditor(
                                      { kind: 'batch', medicine, batch },
                                      event.currentTarget,
                                    )
                                  }
                                >
                                  {t('Edit batch')}
                                </button>
                                {batch.indicators.length > 0 && (
                                  <Indicators values={batch.indicators} />
                                )}
                                <dl className="inventory-facts">
                                  <div>
                                    <dt>{t('Quantity')}</dt>
                                    <dd>{batch.quantity}</dd>
                                  </div>
                                  <div>
                                    <dt>{t('Expiry date')}</dt>
                                    <dd>
                                      <time
                                        dateTime={batch.expiryDate}
                                        dir="ltr"
                                      >
                                        {batch.expiryDate}
                                      </time>
                                    </dd>
                                  </div>
                                  <div>
                                    <dt>{t('Storage location')}</dt>
                                    <dd>{batch.storageLocation}</dd>
                                  </div>
                                  <div>
                                    <dt>{t('Unit cost')}</dt>
                                    <dd dir="ltr">{batch.unitCost}</dd>
                                  </div>
                                  <div>
                                    <dt>{t('Barcode')}</dt>
                                    <dd>
                                      <bdi dir="ltr">
                                        {batch.barcode ?? t('Not provided')}
                                      </bdi>
                                    </dd>
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
