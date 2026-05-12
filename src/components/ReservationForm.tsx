'use client';

import { Save, X } from 'lucide-react';
import { useMemo, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { z } from 'zod';

import type { Location, Reservation, ReservationPayload, Room } from '../api/types';
import { dateTimeLocalToIso, toDateTimeLocal } from '../utils/date';
import { Button, FeedbackMessage, Field, fieldControlClass, IconButton, cx } from './ui';

const reservationSchema = z
  .object({
    location_id: z.string().min(1, 'Local obrigatório'),
    room_id: z.string().min(1, 'Sala obrigatória'),
    start_at: z.string().min(1, 'Início obrigatório'),
    end_at: z.string().min(1, 'Fim obrigatório'),
    responsible: z.string().trim().min(2, 'Responsável obrigatório').max(160),
    coffee: z.boolean(),
    attendees: z.union([z.literal(''), z.coerce.number().int().min(1).max(500)]).optional(),
    description: z.string().max(2000).optional()
  })
  .superRefine((values, context) => {
    if (new Date(values.end_at) <= new Date(values.start_at)) {
      context.addIssue({
        code: 'custom',
        path: ['end_at'],
        message: 'Fim deve ser posterior ao início'
      });
    }
    if (values.coffee && (values.attendees === '' || values.attendees === undefined)) {
      context.addIssue({
        code: 'custom',
        path: ['attendees'],
        message: 'Informe a quantidade'
      });
    }
  });

type ReservationFormInput = {
  location_id: string;
  room_id: string;
  start_at: string;
  end_at: string;
  responsible: string;
  coffee: boolean;
  attendees: string | number;
  description: string;
};

type ReservationFieldErrors = Partial<Record<keyof ReservationFormInput, string>>;

type ReservationFormProps = {
  locations: Location[];
  rooms: Room[];
  reservation?: Reservation | null;
  pending?: boolean;
  apiError?: string | null;
  onCancel: () => void;
  onSubmit: (payload: ReservationPayload) => void;
};

const fieldNames = new Set<keyof ReservationFormInput>([
  'location_id',
  'room_id',
  'start_at',
  'end_at',
  'responsible',
  'coffee',
  'attendees',
  'description'
]);

function buildDefaults(reservation?: Reservation | null): ReservationFormInput {
  const start = new Date();
  start.setMinutes(0, 0, 0);
  start.setHours(start.getHours() + 1);
  const end = new Date(start.getTime() + 60 * 60_000);

  return {
    location_id: reservation?.location_id ?? '',
    room_id: reservation?.room_id ?? '',
    start_at: reservation ? toDateTimeLocal(reservation.start_at) : toDateTimeLocal(start),
    end_at: reservation ? toDateTimeLocal(reservation.end_at) : toDateTimeLocal(end),
    responsible: reservation?.responsible ?? '',
    coffee: reservation?.coffee ?? false,
    attendees: reservation?.attendees ?? '',
    description: reservation?.description ?? ''
  };
}

function mapZodErrors(error: z.ZodError): ReservationFieldErrors {
  const next: ReservationFieldErrors = {};
  for (const issue of error.issues) {
    const field = issue.path[0];
    if (typeof field === 'string' && fieldNames.has(field as keyof ReservationFormInput)) {
      const key = field as keyof ReservationFormInput;
      if (!next[key]) {
        next[key] = issue.message;
      }
    }
  }
  return next;
}

export function ReservationForm({
  locations,
  rooms,
  reservation,
  pending = false,
  apiError = null,
  onCancel,
  onSubmit
}: ReservationFormProps) {
  const [values, setValues] = useState<ReservationFormInput>(() => buildDefaults(reservation));
  const [errors, setErrors] = useState<ReservationFieldErrors>({});

  const filteredRooms = useMemo(
    () => rooms.filter((room) => !values.location_id || room.location_id === values.location_id),
    [values.location_id, rooms]
  );

  const updateField = <K extends keyof ReservationFormInput>(field: K, value: ReservationFormInput[K]) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleTextChange =
    (field: Exclude<keyof ReservationFormInput, 'coffee'>) =>
    (event: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      updateField(field, event.target.value);
    };

  const handleLocationChange = (event: ChangeEvent<HTMLSelectElement>) => {
    const locationId = event.target.value;
    setValues((current) => ({
      ...current,
      location_id: locationId,
      room_id:
        current.room_id && rooms.some((room) => room.id === current.room_id && room.location_id === locationId)
          ? current.room_id
          : ''
    }));
    setErrors((current) => {
      const next = { ...current };
      delete next.location_id;
      delete next.room_id;
      return next;
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const parsed = reservationSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(mapZodErrors(parsed.error));
      return;
    }

    const parsedValues = parsed.data;
    setErrors({});
    onSubmit({
      location_id: parsedValues.location_id,
      room_id: parsedValues.room_id,
      start_at: dateTimeLocalToIso(parsedValues.start_at),
      end_at: dateTimeLocalToIso(parsedValues.end_at),
      responsible: parsedValues.responsible.trim(),
      coffee: parsedValues.coffee,
      attendees: parsedValues.coffee && typeof parsedValues.attendees === 'number' ? parsedValues.attendees : null,
      description: parsedValues.description?.trim() ? parsedValues.description.trim() : null
    });
  };

  return (
    <div className="fixed inset-0 z-20 bg-aurum-text/40" role="presentation">
      <aside
        className="absolute inset-y-0 right-0 w-full max-w-[560px] overflow-y-auto bg-white p-[22px] shadow-aurum-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="reservation-form-title"
      >
        <header className="mb-[22px] flex items-center justify-between gap-3">
          <h2 className="m-0 text-[1.08rem] font-bold tracking-normal text-aurum-text" id="reservation-form-title">
            {reservation ? 'Editar reserva' : 'Nova reserva'}
          </h2>
          <IconButton variant="soft" onClick={onCancel} aria-label="Fechar">
            <X size={18} aria-hidden="true" />
          </IconButton>
        </header>

        <form className="grid gap-4" onSubmit={submit}>
          <Field label="Local / filial" error={errors.location_id}>
            <select className={fieldControlClass} value={values.location_id} onChange={handleLocationChange}>
              <option value="">Selecione</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Sala" error={errors.room_id}>
            <select className={fieldControlClass} value={values.room_id} onChange={handleTextChange('room_id')}>
              <option value="">Selecione</option>
              {filteredRooms.map((room) => (
                <option key={room.id} value={room.id}>
                  {room.name} ({room.capacity})
                </option>
              ))}
            </select>
          </Field>

          <div className="grid grid-cols-2 gap-3 max-[820px]:grid-cols-1">
            <Field label="Início" error={errors.start_at}>
              <input
                className={fieldControlClass}
                type="datetime-local"
                value={values.start_at}
                onChange={handleTextChange('start_at')}
              />
            </Field>
            <Field label="Fim" error={errors.end_at}>
              <input
                className={fieldControlClass}
                type="datetime-local"
                value={values.end_at}
                onChange={handleTextChange('end_at')}
              />
            </Field>
          </div>

          <Field label="Responsável" error={errors.responsible}>
            <input className={fieldControlClass} value={values.responsible} onChange={handleTextChange('responsible')} />
          </Field>

          <label className="flex items-center gap-2.5 text-[0.88rem] font-bold text-aurum-text">
            <input
              className="h-[18px] min-h-[18px] w-[18px] accent-aurum-primary"
              type="checkbox"
              checked={values.coffee}
              onChange={(event) => updateField('coffee', event.target.checked)}
            />
            <span>Café</span>
          </label>

          <Field
            label="Quantidade de pessoas"
            help="Obrigatório quando café estiver marcado."
            helpId="attendees-help"
            error={errors.attendees}
          >
            <input
              className={fieldControlClass}
              aria-describedby="attendees-help"
              inputMode="numeric"
              type="number"
              min={1}
              max={500}
              value={values.attendees}
              onChange={handleTextChange('attendees')}
            />
          </Field>

          <Field label="Descrição">
            <textarea
              className={cx(fieldControlClass, 'resize-y')}
              rows={4}
              value={values.description}
              onChange={handleTextChange('description')}
            />
          </Field>

          {apiError ? <FeedbackMessage>{apiError}</FeedbackMessage> : null}

          <div className="pointer-events-none flex items-center justify-end gap-2.5 pt-2 max-[520px]:grid max-[520px]:grid-cols-1">
            <Button variant="secondary" mobileFullWidth onClick={onCancel}>
              Cancelar
            </Button>
            <Button type="submit" mobileFullWidth disabled={pending}>
              <Save size={18} aria-hidden="true" />
              {pending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </form>
      </aside>
    </div>
  );
}
