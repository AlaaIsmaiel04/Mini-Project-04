import { useLanguage } from '../preferences/LanguageProvider';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { OwnerPharmacy } from '@smartshelf/contracts';
import type { OwnerPharmacyService } from './owner-api';
import { PharmacistAccountForm } from './PharmacistAccountForm';
import { SubscriptionForm } from './SubscriptionForm';

export function OwnerPharmacyManagement({
  pharmacyId,
  service,
  onChanged,
}: {
  pharmacyId: string;
  service: OwnerPharmacyService;
  onChanged?: () => void;
}) {
  const { t, translateMessage } = useLanguage();
  const [pharmacy, setPharmacy] = useState<OwnerPharmacy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    heading.current?.focus();
  }, []);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    service.list({}, controller.signal).then(
      (result) => {
        if (controller.signal.aborted) return;
        const match = result.items.find((item) => item.id === pharmacyId);
        setPharmacy(match ?? null);
        if (!match)
          setError(
            'This pharmacy was not found. Return to the pharmacy list and try again.',
          );
        setLoading(false);
      },
      (reason) => {
        if (controller.signal.aborted) return;
        setError(
          reason instanceof Error
            ? reason.message
            : 'Unable to load pharmacy details.',
        );
        setLoading(false);
      },
    );
    return () => controller.abort();
  }, [pharmacyId, service, revision]);

  function saved(message: string) {
    setNotice(message);
    setRevision((value) => value + 1);
    onChanged?.();
  }

  return (
    <section
      className="owner-panel owner-management"
      aria-labelledby="management-heading"
      aria-busy={loading}
    >
      <h3 id="management-heading" ref={heading} tabIndex={-1}>
        {t('Manage pharmacy')}
        {pharmacy ? ` — ${pharmacy.name}` : ''}
      </h3>
      {notice && (
        <p role="status" className="owner-success">
          {translateMessage(notice)}
        </p>
      )}
      {loading && <p role="status">{t('Loading pharmacy details…')}</p>}
      {error && (
        <div role="alert" className="form-error">
          <p>{translateMessage(error)}</p>
          <button
            className="owner-secondary"
            type="button"
            onClick={() => setRevision((value) => value + 1)}
          >
            {t('Retry details')}
          </button>
        </div>
      )}
      {!loading && !error && pharmacy && (
        <>
          <p>
            {t('Current subscription status:')}{' '}
            <strong>
              {pharmacy.subscriptionStatus === 'NONE'
                ? t('No subscription')
                : translateMessage(pharmacy.subscriptionStatus)}
            </strong>
          </p>
          <div className="owner-management-grid">
            <PharmacistAccountForm
              key={pharmacy.id}
              pharmacy={pharmacy}
              service={service}
            />
            <SubscriptionForm
              key={[
                pharmacy.id,
                pharmacy.subscription?.id,
                pharmacy.subscription?.startDate,
                pharmacy.subscription?.endDate,
                pharmacy.subscription?.suspended,
              ].join(':')}
              pharmacy={pharmacy}
              service={service}
              onSaved={saved}
            />
          </div>
        </>
      )}
    </section>
  );
}

// Route identifiers select a pharmacy; the backend remains responsible for authorization.
export function OwnerSubscriptionRoute({
  service,
}: {
  service: OwnerPharmacyService;
}) {
  const { t, translateMessage } = useLanguage();
  const { pharmacyId } = useParams();
  return (
    <div className="owner-page">
      <Link to="/owner">{t('Back to pharmacies')}</Link>
      {pharmacyId && (
        <OwnerPharmacyManagement
          key={pharmacyId}
          pharmacyId={pharmacyId}
          service={service}
        />
      )}
    </div>
  );
}
