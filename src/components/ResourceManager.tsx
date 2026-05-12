'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, DoorOpen, Plus, Trash2 } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Location, LocationPayload, Room, RoomPayload } from '../api/types';
import { Button, Field, FieldError, fieldControlClass, IconButton } from './ui';

const locationSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  address: z.string().trim().max(240).optional()
});

const roomSchema = z.object({
  location_id: z.string().min(1, 'Local obrigatório'),
  name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  capacity: z.coerce.number().int().min(1).max(500)
});

type LocationForm = z.infer<typeof locationSchema>;
type RoomFormInput = z.input<typeof roomSchema>;
type RoomForm = z.output<typeof roomSchema>;

type ResourceManagerProps = {
  locations: Location[];
  rooms: Room[];
  onCreateLocation: (payload: LocationPayload) => void;
  onDeleteLocation: (id: string) => void;
  onCreateRoom: (payload: RoomPayload) => void;
  onDeleteRoom: (id: string) => void;
  pending?: boolean;
};

export function ResourceManager({
  locations,
  rooms,
  onCreateLocation,
  onDeleteLocation,
  onCreateRoom,
  onDeleteRoom,
  pending = false
}: ResourceManagerProps) {
  const locationForm = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '' }
  });
  const roomForm = useForm<RoomFormInput, unknown, RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: { location_id: '', name: '', capacity: 1 }
  });

  useEffect(() => {
    if (!roomForm.getValues('location_id') && locations[0]) {
      roomForm.setValue('location_id', locations[0].id);
    }
  }, [locations, roomForm]);

  const submitLocation = (values: LocationForm) => {
    onCreateLocation({ name: values.name.trim(), address: values.address?.trim() || null });
    locationForm.reset({ name: '', address: '' });
  };

  const submitRoom = (values: RoomForm) => {
    onCreateRoom({
      location_id: values.location_id,
      name: values.name.trim(),
      capacity: values.capacity
    });
    roomForm.reset({ location_id: values.location_id, name: '', capacity: 1 });
  };

  return (
    <div className="grid grid-cols-2 gap-[18px] p-4 max-[1180px]:grid-cols-1">
      <section
        className="grid content-start gap-4 rounded-lg border border-aurum-border bg-white p-4"
        aria-labelledby="locations-title"
      >
        <header className="flex items-center gap-[9px]">
          <Building2 size={20} aria-hidden="true" />
          <h2 className="m-0 text-[1.08rem] font-bold tracking-normal text-aurum-text" id="locations-title">
            Locais
          </h2>
        </header>

        <form
          className="grid grid-cols-[repeat(2,minmax(0,1fr))_auto] items-end gap-2.5 max-[820px]:grid-cols-1"
          onSubmit={(event) => void locationForm.handleSubmit(submitLocation)(event)}
        >
          <Field label="Nome" error={locationForm.formState.errors.name?.message}>
            <input className={fieldControlClass} {...locationForm.register('name')} />
          </Field>
          <Field label="Endereço" error={locationForm.formState.errors.address?.message}>
            <input className={fieldControlClass} {...locationForm.register('address')} />
          </Field>
          <Button type="submit" disabled={pending}>
            <Plus size={18} aria-hidden="true" />
            Adicionar
          </Button>
        </form>
        {locationForm.formState.errors.root ? (
          <FieldError>{locationForm.formState.errors.root.message}</FieldError>
        ) : null}

        <div className="grid gap-2.5">
          {locations.map((location) => (
            <article
              className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-aurum-border bg-aurum-soft px-3 py-2.5"
              key={location.id}
            >
              <div className="grid gap-[3px]">
                <strong>{location.name}</strong>
                <span className="text-[0.84rem] text-aurum-muted">{location.address || 'Sem endereço'}</span>
              </div>
              <IconButton
                variant="danger"
                type="button"
                onClick={() => onDeleteLocation(location.id)}
                aria-label={`Excluir ${location.name}`}
              >
                <Trash2 size={17} aria-hidden="true" />
              </IconButton>
            </article>
          ))}
        </div>
      </section>

      <section
        className="grid content-start gap-4 rounded-lg border border-aurum-border bg-white p-4"
        aria-labelledby="rooms-title"
      >
        <header className="flex items-center gap-[9px]">
          <DoorOpen size={20} aria-hidden="true" />
          <h2 className="m-0 text-[1.08rem] font-bold tracking-normal text-aurum-text" id="rooms-title">
            Salas
          </h2>
        </header>

        <form
          className="grid grid-cols-[repeat(2,minmax(0,1fr))_auto] items-end gap-2.5 max-[820px]:grid-cols-1"
          onSubmit={(event) => void roomForm.handleSubmit(submitRoom)(event)}
        >
          <Field label="Local" error={roomForm.formState.errors.location_id?.message}>
            <select className={fieldControlClass} {...roomForm.register('location_id')}>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome" error={roomForm.formState.errors.name?.message}>
            <input className={fieldControlClass} {...roomForm.register('name')} />
          </Field>
          <Field className="max-w-[130px] max-[820px]:max-w-none" label="Capacidade" error={roomForm.formState.errors.capacity?.message}>
            <input className={fieldControlClass} type="number" min={1} max={500} {...roomForm.register('capacity')} />
          </Field>
          <Button type="submit" disabled={pending || locations.length === 0}>
            <Plus size={18} aria-hidden="true" />
            Adicionar
          </Button>
        </form>
        {roomForm.formState.errors.root ? (
          <FieldError>{roomForm.formState.errors.root.message}</FieldError>
        ) : null}

        <div className="grid gap-2.5">
          {rooms.map((room) => (
            <article
              className="flex min-h-16 items-center justify-between gap-3 rounded-lg border border-aurum-border bg-aurum-soft px-3 py-2.5"
              key={room.id}
            >
              <div className="grid gap-[3px]">
                <strong>{room.name}</strong>
                <span className="text-[0.84rem] text-aurum-muted">
                  {locations.find((location) => location.id === room.location_id)?.name ?? 'Local'} ·{' '}
                  {room.capacity} pessoas
                </span>
              </div>
              <IconButton
                variant="danger"
                type="button"
                onClick={() => onDeleteRoom(room.id)}
                aria-label={`Excluir ${room.name}`}
              >
                <Trash2 size={17} aria-hidden="true" />
              </IconButton>
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
