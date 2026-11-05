import { useEffect, useLayoutEffect, useState, useRef } from 'react';
import type { FormEvent } from 'react';
import type { DutyPeriod, ListResponse } from '@smartshelf/contracts';
import { useLanguage } from '../preferences/LanguageProvider';
import { useRefreshOnFocus } from '../../lib/use-refresh';
import { ApiRequestError } from '../../lib/api';
import type { PharmacyService } from './pharmacy-api';
import { dutyInput, toLocalDateTime } from './duty-time';

export function DutyManager({
  service,
  active,
  onForbidden,
}: {
  service: PharmacyService;
  active: boolean;
  onForbidden: () => void;
}) {
  const { t, translateMessage, language } = useLanguage();

  const [list, setList] = useState<ListResponse<DutyPeriod> | null>(null),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(''),
    [notice, setNotice] = useState(''),
    [formError, setFormError] = useState('');

  const [revision, refresh] = useRefreshOnFocus();
  const [editor, setEditor] = useState<{
      id?: string;
      start: string;
      end: string;
    } | null>(null),
    [pending, setPending] = useState(false),
    [deleting, setDeleting] = useState<string | null>(null),
    [now, setNow] = useState(Date.now());
  const saving = useRef(false),
    heading = useRef<HTMLHeadingElement>(null),
    addButton = useRef<HTMLButtonElement>(null),
    restoreAddFocus = useRef(false);

  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true);
    setError('');
    service
      .duties(controller.signal)
      .then(
        (data) => {
          if (!controller.signal.aborted) {
            setList(data);
            setNow(Date.now());
          }
        },
        (reason) => {
          if (!controller.signal.aborted)
            setError(
              reason instanceof Error
                ? reason.message
                : 'Unable to load duty periods.',
            );
        },
      )
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [service, revision]);

  useEffect(() => {
    if (editor) heading.current?.focus();
  }, [editor?.id, !!editor]);

  const blocked = pending || !!deleting || !active || loading || !!error;

  useLayoutEffect(() => {
    if (!editor && restoreAddFocus.current) {
      restoreAddFocus.current = false;
      addButton.current?.focus();
    }
  }, [editor]);

  function close() {
    restoreAddFocus.current = true;
    setEditor(null);
    setFormError('');
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current || blocked || !editor) return;
    setFormError('');
    setNotice('');
    let input;
    try {
      input = dutyInput(editor.start, editor.end);
    } catch (reason) {
      setFormError((reason as Error).message);
      return;
    }

    saving.current = true;
    setPending(true);
    try {
      await service.saveDuty(input, editor.id);
      close();
      setNotice(editor.id ? 'Duty period updated.' : 'Duty period added.');
      refresh();
    } catch (reason) {
      setFormError(
        reason instanceof Error
          ? reason.message
          : 'Unable to save duty period.',
      );
      if (reason instanceof ApiRequestError && reason.status === 403)
        onForbidden();
    } finally {
      saving.current = false;
      setPending(false);
    }
  }

  async function remove(period: DutyPeriod) {
    if (saving.current || blocked || editor) return;
    if (!window.confirm(t('Delete this duty period?'))) return;
    setError('');
    setNotice('');
    saving.current = true;
    setDeleting(period.id);
    try {
      await service.deleteDuty(period.id);
      setNotice('Duty period deleted.');
      refresh();
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to delete duty period.',
      );
      if (reason instanceof ApiRequestError && reason.status === 403)
        onForbidden();
    } finally {
      saving.current = false;
      setDeleting(null);
    }
  }

  const format = (value: string) =>
    new Intl.DateTimeFormat(language === 'ar' ? 'ar-JO' : 'en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
      timeZone: zone,
    }).format(new Date(value));

  return (
    <section
      className="surface"
      aria-labelledby="duties-heading"
      aria-busy={loading}
    >
      <h3 id="duties-heading">{t('Duty schedule')}</h3>
      <p>{t('Local timezone: {zone}', { zone })}</p>
      <p>
        {t(
          'Times use your device timezone and are sent to the server as UTC. Overnight periods are allowed, up to 24 hours.',
        )}
      </p>

      {loading && <p role="status">{t('Loading duty periods…')}</p>}

      {error && (
        <div role="alert" className="form-error">
          <p>{translateMessage(error)}</p>
          <button type="button" className="button" onClick={refresh}>
            {t('Retry duties')}
          </button>
        </div>
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

      <button
        ref={addButton}
        type="button"
        className="button"
        disabled={blocked || !!editor}
        onClick={() => {
          setFormError('');
          setNotice('');
          setEditor({ start: '', end: '' });
        }}
      >
        {t('Add duty period')}
      </button>

      {editor && (
        <form className="pharmacist-form" onSubmit={save} aria-busy={pending}>
          <h4 ref={heading} tabIndex={-1}>
            {editor.id ? t('Edit duty period') : t('Add duty period')}
          </h4>

          <fieldset disabled={blocked}>
            <legend className="visually-hidden">{t('Duty times')}</legend>

            <label htmlFor="duty-start">
              {t('Duty start')}
              <input
                id="duty-start"
                type="datetime-local"
                dir="ltr"
                required
                value={editor.start}
                onChange={(e) =>
                  setEditor({ ...editor, start: e.target.value })
                }
              />
            </label>

            <label htmlFor="duty-end">
              {t('Duty end')}
              <input
                id="duty-end"
                type="datetime-local"
                dir="ltr"
                required
                value={editor.end}
                onChange={(e) => setEditor({ ...editor, end: e.target.value })}
              />
            </label>
          </fieldset>
          {formError && (
            <p role="alert" className="form-error">
              {translateMessage(formError)}
            </p>
          )}

          <div className="pharmacist-actions">
            <button className="button" disabled={blocked}>
              {pending ? t('Saving…') : t('Save duty period')}
            </button>
            <button
              type="button"
              className="button button-secondary"
              disabled={pending}
              onClick={close}
            >
              {t('Cancel')}
            </button>
          </div>
        </form>
      )}

      {list && list.items.length === 0 && !loading && !error && (
        <p>{t('No duty periods scheduled.')}</p>
      )}

      {list && (
        <ul className="duty-list">
          {list.items.map((period) => {
            const current =
              Date.parse(period.startsAt) <= now &&
              now < Date.parse(period.endsAt);
            return (
              <li key={period.id}>
                <p className="duty-status">
                  {current
                    ? t('On duty now')
                    : Date.parse(period.startsAt) > now
                      ? t('Upcoming duty')
                      : t('Past duty')}
                </p>

                <p>
                  {t('From:')}{' '}
                  <time dateTime={period.startsAt}>
                    {format(period.startsAt)}
                  </time>
                </p>
                <p>
                  {t('To:')}{' '}
                  <time dateTime={period.endsAt}>{format(period.endsAt)}</time>
                </p>

                <div className="pharmacist-actions">
                  <button
                    type="button"
                    className="button button-secondary"
                    disabled={blocked || !!editor}
                    onClick={() => {
                      setNotice('');
                      setFormError('');
                      setEditor({
                        id: period.id,
                        start: toLocalDateTime(period.startsAt),
                        end: toLocalDateTime(period.endsAt),
                      });
                    }}
                  >
                    {t('Edit duty period')}
                  </button>

                  <button
                    type="button"
                    className="button pharmacist-danger"
                    disabled={blocked || !!editor}
                    onClick={() => void remove(period)}
                  >
                    {deleting === period.id
                      ? t('Deleting…')
                      : t('Delete duty period')}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
