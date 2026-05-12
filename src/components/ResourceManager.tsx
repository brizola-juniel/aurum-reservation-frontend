'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { Building2, Check, DoorOpen, Edit3, Plus, Trash2, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import type { Location, LocationPayload, Room, RoomPayload } from '../api/types';
import { Button, FeedbackMessage, Field, FieldError, fieldControlClass, IconButton } from './ui';

const locationSchema = z.object({
  name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  address: z.string().trim().max(240).optional()
});

const roomSchema = z.object({
  location_id: z.string().min(1, 'Local obrigatório'),
  name: z.string().trim().min(2, 'Nome obrigatório').max(120),
  capacity: z.coerce.number().int('Capacidade deve ser um número inteiro').min(1, 'Capacidade mínima é 1').max(500)
});

type LocationForm = z.infer<typeof locationSchema>;
type RoomFormInput = z.input<typeof roomSchema>;
type RoomForm = z.output<typeof roomSchema>;

type ResourceManagerProps = {
  locations: Location[];
  rooms: Room[];
  feedback?: string | null;
  onCreateLocation: (payload: LocationPayload) => Promise<void>;
  onUpdateLocation: (id: string, payload: LocationPayload) => Promise<void>;
  onRequestDeleteLocation: (location: Location) => void;
  onCreateRoom: (payload: RoomPayload) => Promise<void>;
  onUpdateRoom: (id: string, payload: RoomPayload) => Promise<void>;
  onRequestDeleteRoom: (room: Room) => void;
  pending?: boolean;
};

export function ResourceManager({
  locations,
  rooms,
  feedback = null,
  onCreateLocation,
  onUpdateLocation,
  onRequestDeleteLocation,
  onCreateRoom,
  onUpdateRoom,
  onRequestDeleteRoom,
  pending = false
}: ResourceManagerProps) {
  const [editingLocationId, setEditingLocationId] = useState<string | null>(null);
  const [editingRoomId, setEditingRoomId] = useState<string | null>(null);
  const locationReturnFocusId = useRef<string | null>(null);
  const roomReturnFocusId = useRef<string | null>(null);
  const locationForm = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '' }
  });
  const locationEditForm = useForm<LocationForm>({
    resolver: zodResolver(locationSchema),
    defaultValues: { name: '', address: '' }
  });
  const roomForm = useForm<RoomFormInput, unknown, RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: { location_id: '', name: '', capacity: 1 }
  });
  const roomEditForm = useForm<RoomFormInput, unknown, RoomForm>({
    resolver: zodResolver(roomSchema),
    defaultValues: { location_id: '', name: '', capacity: 1 }
  });

  useEffect(() => {
    if (!roomForm.getValues('location_id') && locations[0]) {
      roomForm.setValue('location_id', locations[0].id);
    }
  }, [locations, roomForm]);

  useEffect(() => {
    if (editingLocationId) {
      locationEditForm.setFocus('name');
      return;
    }

    if (locationReturnFocusId.current) {
      document
        .querySelector<HTMLButtonElement>(`[data-location-edit-id="${locationReturnFocusId.current}"]`)
        ?.focus();
      locationReturnFocusId.current = null;
    }
  }, [editingLocationId, locationEditForm]);

  useEffect(() => {
    if (editingRoomId) {
      roomEditForm.setFocus('name');
      return;
    }

    if (roomReturnFocusId.current) {
      document.querySelector<HTMLButtonElement>(`[data-room-edit-id="${roomReturnFocusId.current}"]`)?.focus();
      roomReturnFocusId.current = null;
    }
  }, [editingRoomId, roomEditForm]);

  const startLocationEdit = (location: Location) => {
    locationReturnFocusId.current = location.id;
    roomReturnFocusId.current = null;
    setEditingRoomId(null);
    setEditingLocationId(location.id);
    locationEditForm.reset({ name: location.name, address: location.address ?? '' });
  };

  const startRoomEdit = (room: Room) => {
    roomReturnFocusId.current = room.id;
    locationReturnFocusId.current = null;
    setEditingLocationId(null);
    setEditingRoomId(room.id);
    roomEditForm.reset({ location_id: room.location_id, name: room.name, capacity: room.capacity });
  };

  const cancelLocationEdit = () => {
    setEditingLocationId(null);
  };

  const cancelRoomEdit = () => {
    setEditingRoomId(null);
  };

  const submitLocation = async (values: LocationForm) => {
    try {
      await onCreateLocation({ name: values.name.trim(), address: values.address?.trim() || null });
      locationForm.reset({ name: '', address: '' });
    } catch {
      // Mutation feedback is rendered by the dashboard.
    }
  };

  const submitLocationUpdate = async (values: LocationForm) => {
    if (!editingLocationId) {
      return;
    }
    try {
      await onUpdateLocation(editingLocationId, { name: values.name.trim(), address: values.address?.trim() || null });
      setEditingLocationId(null);
    } catch {
      // Mutation feedback is rendered by the dashboard.
    }
  };

  const submitRoom = async (values: RoomForm) => {
    try {
      await onCreateRoom({
        location_id: values.location_id,
        name: values.name.trim(),
        capacity: values.capacity
      });
      roomForm.reset({ location_id: values.location_id, name: '', capacity: 1 });
    } catch {
      // Mutation feedback is rendered by the dashboard.
    }
  };

  const submitRoomUpdate = async (values: RoomForm) => {
    if (!editingRoomId) {
      return;
    }
    try {
      await onUpdateRoom(editingRoomId, {
        location_id: values.location_id,
        name: values.name.trim(),
        capacity: values.capacity
      });
      setEditingRoomId(null);
    } catch {
      // Mutation feedback is rendered by the dashboard.
    }
  };

  return (
    <div className="grid grid-cols-2 gap-[18px] p-4 max-[1180px]:grid-cols-1">
      {feedback ? (
        <div className="col-span-2 max-[1180px]:col-span-1">
          <FeedbackMessage>{feedback}</FeedbackMessage>
        </div>
      ) : null}
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
          <Field
            label="Nome"
            controlId="location-name"
            error={locationForm.formState.errors.name?.message}
            errorId="location-name-error"
          >
            <input
              id="location-name"
              aria-describedby={locationForm.formState.errors.name ? 'location-name-error' : undefined}
              aria-invalid={locationForm.formState.errors.name ? 'true' : undefined}
              className={fieldControlClass}
              {...locationForm.register('name')}
            />
          </Field>
          <Field
            label="Endereço"
            controlId="location-address"
            error={locationForm.formState.errors.address?.message}
            errorId="location-address-error"
          >
            <input
              id="location-address"
              aria-describedby={locationForm.formState.errors.address ? 'location-address-error' : undefined}
              aria-invalid={locationForm.formState.errors.address ? 'true' : undefined}
              className={fieldControlClass}
              {...locationForm.register('address')}
            />
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
              className="grid min-h-16 gap-3 rounded-lg border border-aurum-border bg-aurum-soft px-3 py-2.5"
              key={location.id}
            >
              {editingLocationId === location.id ? (
                <form
                  className="grid grid-cols-[repeat(2,minmax(0,1fr))_auto_auto] items-end gap-2.5 max-[820px]:grid-cols-1"
                  onSubmit={(event) => void locationEditForm.handleSubmit(submitLocationUpdate)(event)}
                >
                  <Field
                    label="Nome"
                    controlId={`location-name-${location.id}`}
                    error={locationEditForm.formState.errors.name?.message}
                    errorId={`location-name-${location.id}-error`}
                  >
                    <input
                      id={`location-name-${location.id}`}
                      aria-describedby={
                        locationEditForm.formState.errors.name ? `location-name-${location.id}-error` : undefined
                      }
                      aria-invalid={locationEditForm.formState.errors.name ? 'true' : undefined}
                      className={fieldControlClass}
                      {...locationEditForm.register('name')}
                    />
                  </Field>
                  <Field
                    label="Endereço"
                    controlId={`location-address-${location.id}`}
                    error={locationEditForm.formState.errors.address?.message}
                    errorId={`location-address-${location.id}-error`}
                  >
                    <input
                      id={`location-address-${location.id}`}
                      aria-describedby={
                        locationEditForm.formState.errors.address ? `location-address-${location.id}-error` : undefined
                      }
                      aria-invalid={locationEditForm.formState.errors.address ? 'true' : undefined}
                      className={fieldControlClass}
                      {...locationEditForm.register('address')}
                    />
                  </Field>
                  <IconButton type="submit" disabled={pending} aria-label={`Salvar ${location.name}`}>
                    <Check size={17} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    variant="soft"
                    type="button"
                    onClick={cancelLocationEdit}
                    aria-label={`Cancelar edição de ${location.name}`}
                  >
                    <X size={17} aria-hidden="true" />
                  </IconButton>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="grid gap-[3px]">
                    <strong>{location.name}</strong>
                    <span className="text-[0.84rem] text-aurum-muted">{location.address || 'Sem endereço'}</span>
                  </div>
                  <div className="flex gap-2">
                    <IconButton
                      type="button"
                      data-location-edit-id={location.id}
                      onClick={() => startLocationEdit(location)}
                      aria-label={`Editar ${location.name}`}
                    >
                      <Edit3 size={17} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      variant="danger"
                      type="button"
                      onClick={() => onRequestDeleteLocation(location)}
                      aria-label={`Excluir ${location.name}`}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
              )}
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
          <Field
            label="Local"
            controlId="room-location"
            error={roomForm.formState.errors.location_id?.message}
            errorId="room-location-error"
          >
            <select
              id="room-location"
              aria-describedby={roomForm.formState.errors.location_id ? 'room-location-error' : undefined}
              aria-invalid={roomForm.formState.errors.location_id ? 'true' : undefined}
              className={fieldControlClass}
              {...roomForm.register('location_id')}
            >
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Nome" controlId="room-name" error={roomForm.formState.errors.name?.message} errorId="room-name-error">
            <input
              id="room-name"
              aria-describedby={roomForm.formState.errors.name ? 'room-name-error' : undefined}
              aria-invalid={roomForm.formState.errors.name ? 'true' : undefined}
              className={fieldControlClass}
              {...roomForm.register('name')}
            />
          </Field>
          <Field
            className="max-w-[130px] max-[820px]:max-w-none"
            label="Capacidade"
            controlId="room-capacity"
            error={roomForm.formState.errors.capacity?.message}
            errorId="room-capacity-error"
          >
            <input
              id="room-capacity"
              aria-describedby={roomForm.formState.errors.capacity ? 'room-capacity-error' : undefined}
              aria-invalid={roomForm.formState.errors.capacity ? 'true' : undefined}
              className={fieldControlClass}
              type="number"
              min={1}
              max={500}
              {...roomForm.register('capacity')}
            />
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
              className="grid min-h-16 gap-3 rounded-lg border border-aurum-border bg-aurum-soft px-3 py-2.5"
              key={room.id}
            >
              {editingRoomId === room.id ? (
                <form
                  className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_110px_auto_auto] items-end gap-2.5 max-[980px]:grid-cols-1"
                  onSubmit={(event) => void roomEditForm.handleSubmit(submitRoomUpdate)(event)}
                >
                  <Field
                    label="Local"
                    controlId={`room-location-${room.id}`}
                    error={roomEditForm.formState.errors.location_id?.message}
                    errorId={`room-location-${room.id}-error`}
                  >
                    <select
                      id={`room-location-${room.id}`}
                      aria-describedby={
                        roomEditForm.formState.errors.location_id ? `room-location-${room.id}-error` : undefined
                      }
                      aria-invalid={roomEditForm.formState.errors.location_id ? 'true' : undefined}
                      className={fieldControlClass}
                      {...roomEditForm.register('location_id')}
                    >
                      {locations.map((location) => (
                        <option key={location.id} value={location.id}>
                          {location.name}
                        </option>
                      ))}
                    </select>
                  </Field>
                  <Field
                    label="Nome"
                    controlId={`room-name-${room.id}`}
                    error={roomEditForm.formState.errors.name?.message}
                    errorId={`room-name-${room.id}-error`}
                  >
                    <input
                      id={`room-name-${room.id}`}
                      aria-describedby={roomEditForm.formState.errors.name ? `room-name-${room.id}-error` : undefined}
                      aria-invalid={roomEditForm.formState.errors.name ? 'true' : undefined}
                      className={fieldControlClass}
                      {...roomEditForm.register('name')}
                    />
                  </Field>
                  <Field
                    label="Capacidade"
                    controlId={`room-capacity-${room.id}`}
                    error={roomEditForm.formState.errors.capacity?.message}
                    errorId={`room-capacity-${room.id}-error`}
                  >
                    <input
                      id={`room-capacity-${room.id}`}
                      aria-describedby={
                        roomEditForm.formState.errors.capacity ? `room-capacity-${room.id}-error` : undefined
                      }
                      aria-invalid={roomEditForm.formState.errors.capacity ? 'true' : undefined}
                      className={fieldControlClass}
                      type="number"
                      min={1}
                      max={500}
                      {...roomEditForm.register('capacity')}
                    />
                  </Field>
                  <IconButton type="submit" disabled={pending} aria-label={`Salvar ${room.name}`}>
                    <Check size={17} aria-hidden="true" />
                  </IconButton>
                  <IconButton
                    variant="soft"
                    type="button"
                    onClick={cancelRoomEdit}
                    aria-label={`Cancelar edição de ${room.name}`}
                  >
                    <X size={17} aria-hidden="true" />
                  </IconButton>
                </form>
              ) : (
                <div className="flex items-center justify-between gap-3">
                  <div className="grid gap-[3px]">
                    <strong>{room.name}</strong>
                    <span className="text-[0.84rem] text-aurum-muted">
                      {locations.find((location) => location.id === room.location_id)?.name ?? 'Local'} ·{' '}
                      {room.capacity} pessoas
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <IconButton
                      type="button"
                      data-room-edit-id={room.id}
                      onClick={() => startRoomEdit(room)}
                      aria-label={`Editar ${room.name}`}
                    >
                      <Edit3 size={17} aria-hidden="true" />
                    </IconButton>
                    <IconButton
                      variant="danger"
                      type="button"
                      onClick={() => onRequestDeleteRoom(room)}
                      aria-label={`Excluir ${room.name}`}
                    >
                      <Trash2 size={17} aria-hidden="true" />
                    </IconButton>
                  </div>
                </div>
              )}
            </article>
          ))}
        </div>
      </section>
    </div>
  );
}
