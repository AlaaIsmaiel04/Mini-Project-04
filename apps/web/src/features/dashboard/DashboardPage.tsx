import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import type { Dashboard } from '@smartshelf/contracts';
import { useAuth } from '../auth/AuthProvider';
import { useLanguage } from '../preferences/LanguageProvider';
import { useInventoryRevision } from '../../lib/inventory-updates';
import { useRefreshOnFocus } from '../../lib/use-refresh';
import { createDashboardService } from './dashboard-api';
import '../pharmacy/pharmacist.css';

export default function DashboardPage() {
  const { accessToken, invalidateSession } = useAuth();

  const { t, translateMessage } = useLanguage();

  const service = useMemo(
    () => createDashboardService(accessToken ?? '', invalidateSession),
    [accessToken, invalidateSession],
  );

  const [data, setData] = useState<Dashboard | null>(null);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const [revision, refresh] = useRefreshOnFocus();
  const inventoryRevision = useInventoryRevision();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    setData(null);

    service
      .get(controller.signal)
      .then(
        (result) => {
          if (!controller.signal.aborted) setData(result);
        },
        (reason) => {
          if (!controller.signal.aborted)
            setError(
              reason instanceof Error
                ? reason.message
                : 'Unable to load dashboard.',
            );
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });

    return () => controller.abort();
  }, [service, revision, inventoryRevision]);

  return (
    <div className="pharmacist-page" aria-busy={loading}>
      <header>
        <h2>{t('Pharmacist dashboard')}</h2>
        <p>
          {t('Stock, expiry and subscription information for your pharmacy.')}
        </p>
      </header>

      {loading && <p role="status">{t('Loading dashboard…')}</p>}

      {error && (
        <div className="form-error" role="alert">
          <p>{translateMessage(error)}</p>
          <button type="button" className="button" onClick={refresh}>
            {t('Retry')}
          </button>
        </div>
      )}

      {data && (
        <>
          <section className="surface">
            <h3 dir="auto">{data.pharmacyName}</h3>
            <p>
              {t('Subscription:')}{' '}
              <strong>
                {translateMessage(
                  (
                    {
                      ACTIVE: 'Active',
                      EXPIRED: 'Expired',
                      SUSPENDED: 'Suspended',
                      NONE: 'No subscription',
                    } as const
                  )[data.subscriptionStatus],
                )}
              </strong>
            </p>
            {data.subscriptionStatus !== 'ACTIVE' && (
              <p role="status">
                {t(
                  'Inactive subscriptions can view data. Changes require an active subscription.',
                )}
              </p>
            )}
            <Link to="/pharmacist/inventory">{t('Open inventory')}</Link>
          </section>

          <dl className="dashboard-metrics">
            {(
              [
                ['Total medicines', data.totalMedicines],
                ['Non-expired units', data.totalUnits],
                ['Inventory value', data.inventoryValue],
                ['Expiring-soon batches', data.expiringSoonBatchCount],
                ['Low-stock medicines', data.lowStockMedicineCount],
                ['Expired batches', data.expiredBatchCount],
                ['Expected waste', data.expectedWaste],
              ] as const
            ).map(([label, value]) => (
              <div key={label}>
                <dt>{t(label)}</dt>
                <dd dir="ltr">{value}</dd>
              </div>
            ))}
          </dl>

          {data.totalMedicines === 0 && (
            <p role="status">{t('Your pharmacy has no medicines yet.')}</p>
          )}

          <section className="surface">
            <h3>{t('Needs attention')}</h3>
            {data.attentionItems.length === 0 ? (
              <p>{t('No medicines need attention.')}</p>
            ) : (
              <ul className="attention-list">
                {data.attentionItems.map((item) => (
                  <li key={item.medicineId}>
                    <strong dir="ltr">{item.displayName}</strong>
                    <ul
                      className="pharmacist-badges"
                      aria-label={t('Indicators')}
                    >
                      {item.indicators.map((flag) => (
                        <li
                          key={flag}
                          className={`status-${flag.toLowerCase()}`}
                        >
                          {translateMessage(
                            (
                              {
                                HEALTHY: 'Healthy',
                                LOW_STOCK: 'Low stock',
                                EXPIRED: 'Expired',
                                EXPIRING_SOON: 'Expiring soon',
                              } as const
                            )[flag],
                          )}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
