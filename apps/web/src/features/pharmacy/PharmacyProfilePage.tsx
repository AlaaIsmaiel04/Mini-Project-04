import { useEffect, useMemo, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import type { ProfileResponse } from '@smartshelf/contracts';
import { useAuth } from '../auth/AuthProvider';
import { useLanguage } from '../preferences/LanguageProvider';
import { useRefreshOnFocus } from '../../lib/use-refresh';
import { createPharmacyService, type PharmacyService } from './pharmacy-api';
import { DutyManager } from './DutyManager';
import { ApiRequestError } from '../../lib/api';
import './pharmacist.css';

export function PharmacyProfilePage() {
  const { accessToken, invalidateSession } = useAuth();
  const { t, translateMessage } = useLanguage();

  const service = useMemo(
    () => createPharmacyService(accessToken ?? '', invalidateSession),
    [accessToken, invalidateSession],
  );

  const [profile, setProfile] = useState<ProfileResponse | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState('');

  const [revision, refresh] = useRefreshOnFocus();

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    service
      .profile(controller.signal)
      .then(
        (data) => {
          if (!controller.signal.aborted) setProfile(data);
        },
        (reason) => {
          if (!controller.signal.aborted)
            setError(
              reason instanceof Error
                ? reason.message
                : 'Unable to load pharmacy profile.',
            );
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [service, revision]);

  const active = !loading && !error && profile?.subscriptionStatus === 'ACTIVE';

  return (
    <div className="pharmacist-page">
      <header>
        <h2>{t('Pharmacy profile & duty')}</h2>
        <p>{t('Update contact details and publish your duty schedule.')}</p>
      </header>

      {loading && <p role="status">{t('Loading pharmacy profile…')}</p>}

      {error && (
        <div className="form-error" role="alert">
          <p>{translateMessage(error)}</p>
          <button className="button" onClick={refresh}>
            {t('Retry')}
          </button>
        </div>
      )}

      {profile && (
        <>
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
                )[profile.subscriptionStatus],
              )}
            </strong>
          </p>

          {profile.subscriptionStatus !== 'ACTIVE' && (
            <p role="status">
              {t(
                'Inactive subscriptions can view data. Changes require an active subscription.',
              )}
            </p>
          )}

          <ProfileForm
            key={profile.pharmacy.id}
            profile={profile}
            service={service}
            active={!!active}
            onSaved={(data) => {
              setProfile(data);
              refresh();
            }}
            onForbidden={refresh}
          />
        </>
      )}

      <DutyManager service={service} active={!!active} onForbidden={refresh} />
    </div>
  );
}

function ProfileForm({
  profile,
  service,
  active,
  onSaved,
  onForbidden,
}: {
  profile: ProfileResponse;
  service: PharmacyService;
  active: boolean;
  onSaved: (data: ProfileResponse) => void;
  onForbidden: () => void;
}) {
  const { t, translateMessage } = useLanguage();
  const p = profile.pharmacy;

  const [fields, setFields] = useState({
      area: p.area,
      address: p.address,
      phone: p.phone,
    }),
    [dirty, setDirty] = useState(false),
    [pending, setPending] = useState(false),
    [error, setError] = useState(''),
    [notice, setNotice] = useState('');
  const saving = useRef(false);

  useEffect(() => {
    if (!dirty) setFields({ area: p.area, address: p.address, phone: p.phone });
  }, [p.area, p.address, p.phone, dirty]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || !active) return;
    setError('');
    setNotice('');
    const input = {
      area: fields.area.trim(),
      address: fields.address.trim(),
      phone: fields.phone.trim(),
    };

    if (
      input.area.length < 2 ||
      input.area.length > 80 ||
      input.address.length < 5 ||
      input.address.length > 200 ||
      !/^(?=(?:\D*\d){7})\+?[0-9 ()-]{7,20}$/.test(input.phone)
    ) {
      setError('Enter a valid area, address and phone number.');
      return;
    }

    saving.current = true;
    setPending(true);
    try {
      const data = await service.updateProfile(input);
      setFields({
        area: data.pharmacy.area,
        address: data.pharmacy.address,
        phone: data.pharmacy.phone,
      });
      setDirty(false);
      setNotice('Profile saved.');
      onSaved(data);
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to save pharmacy profile.',
      );
      if (reason instanceof ApiRequestError && reason.status === 403)
        onForbidden();
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  return (
    <section className="surface" aria-labelledby="profile-heading">
      <h3 id="profile-heading">{t('Profile details')}</h3>
      <form className="pharmacist-form" onSubmit={submit} aria-busy={pending}>
        <label htmlFor="profile-name">
          {t('Pharmacy name')}
          <input id="profile-name" value={p.name} readOnly dir="auto" />
        </label>

        <fieldset disabled={pending || !active}>
          <legend className="visually-hidden">
            {t('Editable contact details')}
          </legend>
          {(['area', 'address', 'phone'] as const).map((field) => (
            <label key={field} htmlFor={'profile-' + field}>
              {t(
                ({ area: 'Area', address: 'Address', phone: 'Phone' } as const)[
                  field
                ],
              )}
              <input
                id={'profile-' + field}
                name={field}
                type={field === 'phone' ? 'tel' : 'text'}
                required
                minLength={field === 'area' ? 2 : field === 'address' ? 5 : 7}
                maxLength={
                  field === 'area' ? 80 : field === 'address' ? 200 : 20
                }
                value={fields[field]}
                onChange={(e) => {
                  setFields({ ...fields, [field]: e.target.value });
                  setDirty(true);
                  setNotice('');
                }}
              />
            </label>
          ))}
        </fieldset>

        {error && (
          <p role="alert" className="form-error">
            {translateMessage(error)}
          </p>
        )}
        {notice && (
          <p role="status" className="pharmacist-success">
            {translateMessage(notice)}
          </p>
        )}

        {!active && (
          <p>
            {t('Changes are currently unavailable. Your draft is preserved.')}
          </p>
        )}

        <button className="button" disabled={pending || !active}>
          {pending ? t('Saving…') : t('Save profile')}
        </button>
      </form>
    </section>
  );
}
