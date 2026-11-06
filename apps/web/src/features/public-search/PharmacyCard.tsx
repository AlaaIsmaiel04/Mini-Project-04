import type { PublicPharmacy } from '@smartshelf/contracts';
import { useLanguage } from '../preferences/LanguageProvider';
import { jordanTime } from './public-api';

export function PharmacyCard({ pharmacy }: { pharmacy: PublicPharmacy }) {
  const { t, language } = useLanguage();
  const time = (value: string) =>
    jordanTime(value, language) ?? t('Time unavailable');
  const phone = pharmacy.phone.replace(/[^+\d]/g, '');
  return (
    <article className="public-pharmacy">
      <div className="public-card-heading">
        <h3>
          <bdi>{pharmacy.name}</bdi>
        </h3>
        <span
          className={`public-duty ${pharmacy.onDutyNow ? 'is-on-duty' : ''}`}
        >
          {t(pharmacy.onDutyNow ? 'On duty now' : 'Not on duty')}
        </span>
      </div>
      <p className="public-address">
        <bdi>{pharmacy.area}</bdi>
        <br />
        <bdi>{pharmacy.address}</bdi>
      </p>
      <a
        href={`tel:${phone}`}
        aria-label={`${t('Call pharmacy')}: ${pharmacy.name}`}
      >
        <bdi dir="ltr">{pharmacy.phone}</bdi>
      </a>
      <dl>
        <div>
          <dt>{t('Current duty')}</dt>
          <dd>
            {pharmacy.currentDuty ? (
              <>
                {time(pharmacy.currentDuty.startsAt)} –{' '}
                {time(pharmacy.currentDuty.endsAt)}
              </>
            ) : (
              t('No current duty period')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('Next duty')}</dt>
          <dd>
            {pharmacy.nextDuty ? (
              <>
                {time(pharmacy.nextDuty.startsAt)} –{' '}
                {time(pharmacy.nextDuty.endsAt)}
              </>
            ) : (
              t('No upcoming duty scheduled')
            )}
          </dd>
        </div>
        <div>
          <dt>{t('Inventory updated')}</dt>
          <dd>
            {pharmacy.inventoryUpdatedAt
              ? time(pharmacy.inventoryUpdatedAt)
              : t('Not recorded yet')}
          </dd>
        </div>
      </dl>
    </article>
  );
}
