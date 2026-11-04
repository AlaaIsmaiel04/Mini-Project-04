import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import type {
  Batch,
  InventoryMedicine,
  MedicineInput,
} from '@smartshelf/contracts';
import type { InventoryService } from './inventory-api';
import {
  calendarDate,
  decimalCost,
  nonNegativeNumber,
  requiredText,
  wholeNumber,
} from './inventory-validation';
import { ApiRequestError } from '../../lib/api';

export type InventoryEditor =
  | { kind: 'medicine'; medicine?: InventoryMedicine }
  | { kind: 'batch'; medicine: InventoryMedicine; batch?: Batch };

export function InventoryForm({
  editor,
  service,
  active,
  accessMessage,
  onSaved,
  onCancel,
  onForbidden,
}: {
  editor: InventoryEditor;
  service: InventoryService;
  active: boolean;
  accessMessage: string;
  onSaved: (message: string) => void;
  onCancel: () => void;
  onForbidden: () => void;
}) {
  const batch = editor.kind === 'batch' ? editor.batch : undefined;
  const medicine = editor.medicine;
  const editing = editor.kind === 'medicine' ? !!medicine : !!batch;
  const title = `${editing ? 'Edit' : 'Add'} ${editor.kind === 'medicine' ? 'medicine' : 'batch'}`;
  const heading = useRef<HTMLHeadingElement>(null);
  const submitting = useRef(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [forbidden, setForbidden] = useState(false);
  const [fields, setFields] = useState({
    displayName: medicine?.displayName ?? '',
    scientificName: medicine?.scientificName ?? '',
    category: medicine?.category ?? '',
    reorderThreshold: String(medicine?.reorderThreshold ?? 0),
    batchNumber: batch?.batchNumber ?? '',
    quantity: String(batch?.quantity ?? 0),
    expiryDate: batch?.expiryDate ?? '',
    storageLocation: batch?.storageLocation ?? '',
    unitCost: batch?.unitCost ?? '',
    barcode: batch?.barcode ?? '',
  });
  useEffect(() => {
    heading.current?.focus();
  }, []);
  const blocked = pending || !active || forbidden;

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current || !active || forbidden) return;
    submitting.current = true;
    setError('');
    setPending(true);
    try {
      if (editor.kind === 'medicine') {
        const input: MedicineInput = {
          displayName: requiredText(fields.displayName, 'Display name'),
          scientificName: requiredText(
            fields.scientificName,
            'Scientific name',
          ),
          category: requiredText(fields.category, 'Category'),
          reorderThreshold: nonNegativeNumber(
            fields.reorderThreshold,
            'Reorder threshold',
          ),
        };
        if (medicine) await service.updateMedicine(medicine.id, input);
        else await service.createMedicine(input);
      } else {
        const editable = {
          quantity: wholeNumber(fields.quantity, 'Quantity'),
          expiryDate: calendarDate(fields.expiryDate),
          storageLocation: requiredText(
            fields.storageLocation,
            'Storage location',
          ),
        };
        if (batch) await service.updateBatch(batch.id, editable);
        else
          await service.createBatch(editor.medicine.id, {
            ...editable,
            batchNumber: requiredText(fields.batchNumber, 'Batch number'),
            unitCost: decimalCost(fields.unitCost),
            ...(fields.barcode.trim()
              ? { barcode: fields.barcode.trim() }
              : {}),
          });
      }
      onSaved(
        `${editor.kind === 'medicine' ? 'Medicine' : 'Batch'} ${editing ? 'updated' : 'added'} successfully.`,
      );
    } catch (reason) {
      setError(
        reason instanceof Error
          ? reason.message
          : 'Unable to save. Please try again.',
      );
      if (reason instanceof ApiRequestError && reason.status === 403) {
        setForbidden(true);
        onForbidden();
      }
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  function field(
    name: keyof typeof fields,
    label: string,
    options: {
      type?: string;
      immutable?: boolean;
      optional?: boolean;
      integer?: boolean;
      step?: string;
    } = {},
  ) {
    return (
      <label htmlFor={`stock-${name}`}>
        {label}
        {options.optional ? ' (optional)' : ''}
        {options.immutable ? ' (read-only)' : ''}
        <input
          id={`stock-${name}`}
          name={name}
          type={options.type ?? 'text'}
          value={fields[name]}
          readOnly={options.immutable}
          required={!options.optional}
          min={options.type === 'number' ? '0' : undefined}
          step={
            options.type === 'number'
              ? (options.step ?? (options.integer ? '1' : '0.01'))
              : undefined
          }
          onChange={(event) =>
            setFields((previous) => ({
              ...previous,
              [name]: event.target.value,
            }))
          }
        />
      </label>
    );
  }

  return (
    <section
      className="inventory-panel inventory-editor"
      aria-labelledby="stock-form-heading"
    >
      <h3 id="stock-form-heading" ref={heading} tabIndex={-1}>
        {title}
        {editor.kind === 'batch' ? ` — ${medicine?.displayName}` : ''}
      </h3>
      {editor.kind === 'batch' && (
        <p>
          Past expiry dates are allowed for accurate waste tracking. Batch
          number, unit cost and barcode cannot be changed after creation.
        </p>
      )}
      <form onSubmit={save} aria-busy={pending}>
        <fieldset disabled={blocked} className="inventory-form-fields">
          <legend className="visually-hidden">{title} details</legend>
          {editor.kind === 'medicine' ? (
            <>
              {field('displayName', 'Display name')}
              {field('scientificName', 'Scientific name')}
              {field('category', 'Category')}
              {field('reorderThreshold', 'Reorder threshold', {
                type: 'number',
                step: 'any',
              })}
            </>
          ) : (
            <>
              {field('batchNumber', 'Batch number', { immutable: !!batch })}
              {field('quantity', 'Quantity', { type: 'number', integer: true })}
              {field('expiryDate', 'Expiry date', { type: 'date' })}
              {field('storageLocation', 'Storage location')}
              {field('unitCost', 'Unit purchase cost', {
                type: 'number',
                immutable: !!batch,
              })}
              {field('barcode', 'Barcode text', {
                immutable: !!batch,
                optional: true,
              })}
            </>
          )}
        </fieldset>
        {error && (
          <p role="alert" className="form-error">
            {error}
          </p>
        )}
        {!active && (
          <p role="status">{accessMessage} Your draft is preserved.</p>
        )}
        <div className="inventory-actions">
          <button type="submit" disabled={blocked}>
            {pending ? 'Saving…' : editing ? 'Save changes' : title}
          </button>
          <button
            type="button"
            className="inventory-secondary"
            disabled={pending}
            onClick={onCancel}
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
