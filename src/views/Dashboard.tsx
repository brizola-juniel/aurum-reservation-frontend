'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  CalendarDays,
  CalendarPlus,
  CheckSquare,
  Clock3,
  DoorOpen,
  Edit3,
  LayoutDashboard,
  LogOut,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  XSquare
} from 'lucide-react';
import { useMemo, useState } from 'react';

import { ApiError, reservationsApi } from '../api/client';
import type { Reservation, ReservationPayload } from '../api/types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { ReservationForm } from '../components/ReservationForm';
import { ResourceManager } from '../components/ResourceManager';
import { Button, IconButton, cx } from '../components/ui';
import type { Session } from '../state/session';
import { formatDateTime } from '../utils/date';

type DashboardProps = {
  session: Session;
  onLogout: () => void;
};

type DeletionTarget =
  | { type: 'single'; reservation: Reservation }
  | { type: 'bulk'; ids: string[] }
  | null;

const shellClass =
  'grid min-h-screen gap-4 bg-[linear-gradient(135deg,var(--color-aurum-page)_0%,var(--color-aurum-soft)_44%,var(--color-aurum-page-strong)_100%)] p-4 text-aurum-text lg:grid-cols-[280px_minmax(0,1fr)] lg:gap-5 lg:p-6';
const sidebarClass =
  'flex flex-col gap-6 rounded-[8px] border border-white/10 bg-aurum-text p-5 text-white shadow-aurum-panel lg:sticky lg:top-6 lg:h-[calc(100vh-3rem)] lg:min-h-[620px] lg:self-start';
const sidebarBrandClass = 'flex items-center gap-3';
const brandMarkClass =
  'flex size-12 shrink-0 items-center justify-center rounded-[8px] bg-aurum-primary text-white shadow-[inset_0_0_0_1px_rgb(255_255_255_/_18%)]';
const eyebrowClass = 'text-xs font-bold uppercase tracking-normal text-aurum-primary';
const sidebarEyebrowClass = 'text-xs font-bold uppercase tracking-normal text-white/60';
const sidebarNavClass = 'flex flex-col gap-2';
const sidebarNavButtonClass =
  'flex min-h-11 w-full items-center gap-3 rounded-[8px] border border-white/10 px-3 py-2 text-left text-sm font-semibold text-white/75 transition hover:border-white/30 hover:bg-white/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-aurum-accent';
const sidebarNavButtonActiveClass =
  'border-aurum-accent bg-white/10 text-white shadow-[inset_4px_0_0_var(--color-aurum-accent)]';
const sidebarMetricsClass = 'grid grid-cols-2 gap-2';
const sidebarMetricClass = 'rounded-[8px] border border-white/10 bg-white/[0.08] p-3 text-sm text-white/70';
const sidebarAccountClass = 'mt-auto flex flex-col gap-3';
const userChipClass =
  'overflow-hidden text-ellipsis whitespace-nowrap rounded-[8px] border border-white/10 bg-white/[0.08] px-3 py-2 text-sm text-white/85';
const contentShellClass = 'min-w-0 space-y-5';
const contentHeaderClass =
  'flex flex-col gap-4 rounded-[8px] border border-aurum-border bg-aurum-surface p-5 shadow-aurum-panel md:flex-row md:items-center md:justify-between';
const contentTitleClass = 'min-w-0';
const statusRowClass = 'mt-3 flex flex-wrap gap-2 text-xs font-semibold text-aurum-muted';
const statusPillClass = 'inline-flex items-center gap-1.5 rounded-full border border-aurum-border bg-aurum-soft px-3 py-1';
const contentActionsClass = 'flex flex-wrap items-center gap-2';
const insightGridClass = 'grid grid-cols-1 gap-3 sm:grid-cols-3';
const insightCardBaseClass =
  'flex min-h-28 flex-col justify-between rounded-[8px] border border-aurum-border border-t-4 bg-aurum-surface p-4 shadow-sm';
const insightLabelClass = 'mt-3 text-sm font-semibold text-aurum-muted';
const insightValueClass = 'mt-1 block truncate text-2xl font-bold text-aurum-text';
const feedbackErrorClass =
  'rounded-[8px] border border-aurum-danger/20 bg-aurum-danger-soft p-3 text-sm font-semibold text-aurum-danger';
const workspaceClass = 'overflow-hidden rounded-[8px] border border-aurum-border bg-aurum-surface shadow-aurum-panel';
const toolbarClass = 'flex flex-col gap-3 border-b border-aurum-border p-4 lg:flex-row lg:items-center';
const toolbarCountClass = 'flex min-w-28 items-baseline gap-2 text-sm text-aurum-muted';
const searchFieldClass =
  'flex min-w-0 flex-1 items-center gap-2 rounded-[8px] border border-aurum-border bg-aurum-soft px-3 py-2 text-aurum-muted';
const searchInputClass =
  'min-w-0 flex-1 border-0 bg-transparent text-sm text-aurum-text outline-none placeholder:text-aurum-muted/70';
const toolbarActionsClass = 'flex shrink-0 justify-end';
const tableWrapClass = 'overflow-hidden';
const tableClass = 'w-full border-collapse text-left text-sm max-[820px]:block';
const tableHeadClass = 'bg-aurum-soft text-xs font-bold uppercase tracking-normal text-aurum-muted max-[820px]:hidden';
const tableHeaderCellClass = 'px-4 py-3 align-middle';
const checkboxHeaderCellClass = 'w-12 px-3 py-3 align-middle';
const tableBodyClass = 'divide-y divide-aurum-border max-[820px]:block max-[820px]:divide-y-0 max-[820px]:p-3';
const tableRowClass =
  'transition hover:bg-aurum-soft max-[820px]:mb-3 max-[820px]:grid max-[820px]:grid-cols-1 max-[820px]:rounded-[8px] max-[820px]:border max-[820px]:border-aurum-border max-[820px]:bg-white max-[820px]:p-3 max-[820px]:shadow-sm';
const tableCellClass =
  'px-4 py-3 align-top text-aurum-text max-[820px]:grid max-[820px]:grid-cols-[7.5rem_minmax(0,1fr)] max-[820px]:gap-3 max-[820px]:px-0 max-[820px]:py-2 max-[820px]:before:font-bold max-[820px]:before:text-aurum-muted max-[820px]:before:content-[attr(data-label)]';
const checkboxCellClass =
  'w-12 px-3 py-3 align-top max-[820px]:grid max-[820px]:w-auto max-[820px]:grid-cols-[7.5rem_minmax(0,1fr)] max-[820px]:gap-3 max-[820px]:px-0 max-[820px]:py-2 max-[820px]:before:font-bold max-[820px]:before:text-aurum-muted max-[820px]:before:content-[attr(data-label)]';
const checkboxInputClass = 'size-4 accent-aurum-primary';
const rowActionsClass = 'flex gap-2';
const emptyStateClass = 'p-8 text-center text-sm font-semibold text-aurum-muted';

export function Dashboard({ session, onLogout }: DashboardProps) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'reservations' | 'resources'>('reservations');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<Reservation | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<DeletionTarget>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const csrfToken = session.csrfToken;

  const reservationsQuery = useQuery({
    queryKey: ['reservations'],
    queryFn: () => reservationsApi.listReservations()
  });
  const locationsQuery = useQuery({
    queryKey: ['locations'],
    queryFn: () => reservationsApi.listLocations()
  });
  const roomsQuery = useQuery({
    queryKey: ['rooms'],
    queryFn: () => reservationsApi.listRooms()
  });

  const reservations = useMemo(() => reservationsQuery.data ?? [], [reservationsQuery.data]);
  const locations = useMemo(() => locationsQuery.data ?? [], [locationsQuery.data]);
  const rooms = useMemo(() => roomsQuery.data ?? [], [roomsQuery.data]);
  const selectedArray = useMemo(() => Array.from(selectedIds), [selectedIds]);
  const filteredReservations = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    if (!query) {
      return reservations;
    }

    return reservations.filter((reservation) =>
      [
        reservation.location_name,
        reservation.room_name,
        reservation.responsible,
        reservation.description ?? '',
        formatDateTime(reservation.start_at),
        formatDateTime(reservation.end_at)
      ]
        .join(' ')
        .toLowerCase()
        .includes(query)
    );
  }, [reservations, searchTerm]);
  const visibleReservationIds = useMemo(
    () => filteredReservations.map((reservation) => reservation.id),
    [filteredReservations]
  );
  const allVisibleSelected =
    visibleReservationIds.length > 0 && visibleReservationIds.every((id) => selectedIds.has(id));
  const nextReservation = useMemo(
    () =>
      reservations
        .sort((left, right) => new Date(left.start_at).getTime() - new Date(right.start_at).getTime())[0] ?? null,
    [reservations]
  );

  const invalidateDomain = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['reservations'] }),
      queryClient.invalidateQueries({ queryKey: ['locations'] }),
      queryClient.invalidateQueries({ queryKey: ['rooms'] })
    ]);
  };

  const saveReservation = useMutation({
    mutationFn: (payload: ReservationPayload) =>
      editing
        ? reservationsApi.updateReservation(csrfToken, editing.id, payload)
        : reservationsApi.createReservation(csrfToken, payload),
    onSuccess: () => {
      setFormOpen(false);
      setEditing(null);
      setFormError(null);
      void invalidateDomain();
    },
    onError: (error) => {
      if (error instanceof ApiError) {
        setFormError(error.message);
        return;
      }
      setFormError('Não foi possível salvar a reserva.');
    }
  });

  const deleteReservation = useMutation({
    mutationFn: async (target: DeletionTarget) => {
      if (target?.type === 'single') {
        await reservationsApi.deleteReservation(csrfToken, target.reservation.id);
        return;
      }
      if (target?.type === 'bulk') {
        await reservationsApi.bulkDeleteReservations(csrfToken, target.ids);
      }
    },
    onSuccess: () => {
      setSelectedIds(new Set());
      setDeleteTarget(null);
      void invalidateDomain();
    }
  });

  const createLocation = useMutation({
    mutationFn: (payload: { name: string; address?: string | null }) =>
      reservationsApi.createLocation(csrfToken, payload),
    onSuccess: () => void invalidateDomain()
  });
  const deleteLocation = useMutation({
    mutationFn: (id: string) => reservationsApi.deleteLocation(csrfToken, id),
    onSuccess: () => void invalidateDomain()
  });
  const createRoom = useMutation({
    mutationFn: (payload: { location_id: string; name: string; capacity: number }) =>
      reservationsApi.createRoom(csrfToken, payload),
    onSuccess: () => void invalidateDomain()
  });
  const deleteRoom = useMutation({
    mutationFn: (id: string) => reservationsApi.deleteRoom(csrfToken, id),
    onSuccess: () => void invalidateDomain()
  });

  const toggleSelection = (reservationId: string) => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (next.has(reservationId)) {
        next.delete(reservationId);
      } else {
        next.add(reservationId);
      }
      return next;
    });
  };

  const toggleAll = () => {
    setSelectedIds((current) => {
      const next = new Set(current);
      if (allVisibleSelected) {
        for (const id of visibleReservationIds) {
          next.delete(id);
        }
        return next;
      }
      for (const id of visibleReservationIds) {
        next.add(id);
      }
      return next;
    });
  };

  const loading = reservationsQuery.isLoading || locationsQuery.isLoading || roomsQuery.isLoading;
  const hasLoadError = reservationsQuery.isError || locationsQuery.isError || roomsQuery.isError;

  return (
    <main className={shellClass}>
      <aside className={sidebarClass} aria-label="Navegação principal">
        <div className={sidebarBrandClass}>
          <div className={brandMarkClass} aria-hidden="true">
            <LayoutDashboard size={24} />
          </div>
          <div>
            <p className={sidebarEyebrowClass}>Aurum Reservas Brasil</p>
            <strong className="text-base font-bold">Operações Enterprise</strong>
          </div>
        </div>

        <nav className={sidebarNavClass} aria-label="Seções">
          <button
            className={cx(sidebarNavButtonClass, activeTab === 'reservations' && sidebarNavButtonActiveClass)}
            type="button"
            onClick={() => setActiveTab('reservations')}
          >
            <CalendarDays size={18} aria-hidden="true" />
            Reservas
          </button>
          <button
            className={cx(sidebarNavButtonClass, activeTab === 'resources' && sidebarNavButtonActiveClass)}
            type="button"
            onClick={() => setActiveTab('resources')}
          >
            <Building2 size={18} aria-hidden="true" />
            Locais e salas
          </button>
        </nav>

        <div className={sidebarMetricsClass} aria-label="Resumo operacional">
          <span className={sidebarMetricClass}>
            <strong className="block text-2xl font-bold text-white">{reservations.length}</strong>
            reservas
          </span>
          <span className={sidebarMetricClass}>
            <strong className="block text-2xl font-bold text-white">{rooms.length}</strong>
            salas
          </span>
          <span className={sidebarMetricClass}>
            <strong className="block text-2xl font-bold text-white">{locations.length}</strong>
            locais
          </span>
          <span className={sidebarMetricClass}>
            <strong className="block text-2xl font-bold text-white">{selectedArray.length}</strong>
            selecionadas
          </span>
        </div>

        <div className={sidebarAccountClass}>
          <span className={userChipClass}>{session.user.email}</span>
          <Button variant="sidebar" onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" />
            Sair
          </Button>
        </div>
      </aside>

      <section className={contentShellClass}>
        <header className={contentHeaderClass}>
          <div className={contentTitleClass}>
            <p className={eyebrowClass}>Operação de salas</p>
            <h1 className="mt-1 text-3xl font-bold leading-tight text-aurum-text md:text-4xl">Reservas de salas</h1>
            <div className={statusRowClass} aria-label="Status">
              <span className={statusPillClass}>
                <ShieldCheck size={15} aria-hidden="true" />
                Sessão HttpOnly
              </span>
              <span className={statusPillClass}>
                <Clock3 size={15} aria-hidden="true" />
                {nextReservation ? formatDateTime(nextReservation.start_at) : 'Sem próximas reservas'}
              </span>
            </div>
          </div>
          <div className={contentActionsClass}>
            <IconButton
              size="lg"
              onClick={() => void invalidateDomain()}
              aria-label="Atualizar"
            >
              <RefreshCw size={18} aria-hidden="true" />
            </IconButton>
            {activeTab === 'reservations' ? (
              <Button
                onClick={() => {
                  setEditing(null);
                  setFormError(null);
                  setFormOpen(true);
                }}
              >
                <CalendarPlus size={18} aria-hidden="true" />
                Nova reserva
              </Button>
            ) : null}
          </div>
        </header>

        <section className={insightGridClass} aria-label="Indicadores">
          <article className={`${insightCardBaseClass} border-t-aurum-primary`}>
            <CalendarDays className="text-aurum-primary" size={19} aria-hidden="true" />
            <span className={insightLabelClass}>Reservas</span>
            <strong className={insightValueClass}>{reservations.length}</strong>
          </article>
          <article className={`${insightCardBaseClass} border-t-aurum-accent`}>
            <DoorOpen className="text-aurum-primary-strong" size={19} aria-hidden="true" />
            <span className={insightLabelClass}>Salas</span>
            <strong className={insightValueClass}>{rooms.length}</strong>
          </article>
          <article className={`${insightCardBaseClass} border-t-aurum-muted`}>
            <Clock3 className="text-aurum-muted" size={19} aria-hidden="true" />
            <span className={insightLabelClass}>Próxima</span>
            <strong className={insightValueClass}>{nextReservation ? nextReservation.room_name : '-'}</strong>
          </article>
        </section>

        {hasLoadError ? <p className={feedbackErrorClass}>Não foi possível carregar os dados.</p> : null}

        <section className={workspaceClass}>
          {activeTab === 'reservations' ? (
            <>
              <div className={toolbarClass}>
                <div className={toolbarCountClass}>
                  <strong className="text-2xl font-bold text-aurum-text">{filteredReservations.length}</strong>
                  <span>{searchTerm.trim() ? `de ${reservations.length}` : 'reservas'}</span>
                </div>
                <label className={searchFieldClass}>
                  <Search size={18} aria-hidden="true" />
                  <span className="text-sm font-semibold">Buscar reservas</span>
                  <input
                    className={searchInputClass}
                    aria-label="Buscar reservas"
                    value={searchTerm}
                    onChange={(event) => setSearchTerm(event.target.value)}
                    placeholder="Responsável, sala, local ou data"
                  />
                </label>
                <div className={toolbarActionsClass}>
                  {selectedArray.length > 0 ? (
                    <Button
                      variant="danger"
                      onClick={() => setDeleteTarget({ type: 'bulk', ids: selectedArray })}
                    >
                      <Trash2 size={18} aria-hidden="true" />
                      Excluir {selectedArray.length}
                    </Button>
                  ) : null}
                </div>
              </div>

              <div className={tableWrapClass}>
                <table className={tableClass}>
                  <thead className={tableHeadClass}>
                    <tr>
                      <th className={checkboxHeaderCellClass}>
                        <IconButton
                          size="lg"
                          onClick={toggleAll}
                          aria-label="Selecionar todos"
                          disabled={filteredReservations.length === 0}
                        >
                          {allVisibleSelected ? (
                            <CheckSquare size={18} aria-hidden="true" />
                          ) : (
                            <XSquare size={18} aria-hidden="true" />
                          )}
                        </IconButton>
                      </th>
                      <th className={tableHeaderCellClass}>Local</th>
                      <th className={tableHeaderCellClass}>Sala</th>
                      <th className={tableHeaderCellClass}>Início</th>
                      <th className={tableHeaderCellClass}>Fim</th>
                      <th className={tableHeaderCellClass}>Responsável</th>
                      <th className={tableHeaderCellClass}>Descrição</th>
                      <th className={tableHeaderCellClass}>Ações</th>
                    </tr>
                  </thead>
                  <tbody className={tableBodyClass}>
                    {filteredReservations.map((reservation) => (
                      <tr className={tableRowClass} key={reservation.id}>
                        <td className={checkboxCellClass} data-label="Selecionar">
                          <input
                            className={checkboxInputClass}
                            aria-label={`Selecionar reserva de ${reservation.responsible}`}
                            type="checkbox"
                            checked={selectedIds.has(reservation.id)}
                            onChange={() => toggleSelection(reservation.id)}
                          />
                        </td>
                        <td className={tableCellClass} data-label="Local">
                          {reservation.location_name}
                        </td>
                        <td className={tableCellClass} data-label="Sala">
                          {reservation.room_name}
                        </td>
                        <td className={tableCellClass} data-label="Início">
                          {formatDateTime(reservation.start_at)}
                        </td>
                        <td className={tableCellClass} data-label="Fim">
                          {formatDateTime(reservation.end_at)}
                        </td>
                        <td className={tableCellClass} data-label="Responsável">
                          {reservation.responsible}
                        </td>
                        <td className={tableCellClass} data-label="Descrição">
                          {reservation.description || '-'}
                        </td>
                        <td className={tableCellClass} data-label="Ações">
                          <div className={rowActionsClass}>
                            <IconButton
                              size="lg"
                              onClick={() => {
                                setEditing(reservation);
                                setFormError(null);
                                setFormOpen(true);
                              }}
                              aria-label={`Editar reserva de ${reservation.responsible}`}
                            >
                              <Edit3 size={17} aria-hidden="true" />
                            </IconButton>
                            <IconButton
                              size="lg"
                              variant="danger"
                              onClick={() => setDeleteTarget({ type: 'single', reservation })}
                              aria-label={`Excluir reserva de ${reservation.responsible}`}
                            >
                              <Trash2 size={17} aria-hidden="true" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {!loading && filteredReservations.length === 0 ? (
                  <p className={emptyStateClass}>
                    {reservations.length === 0 ? 'Nenhuma reserva cadastrada.' : 'Nenhuma reserva encontrada.'}
                  </p>
                ) : null}
                {loading ? <p className={emptyStateClass}>Carregando...</p> : null}
              </div>
            </>
          ) : (
            <ResourceManager
              locations={locations}
              rooms={rooms}
              onCreateLocation={(payload) => createLocation.mutate(payload)}
              onDeleteLocation={(id) => deleteLocation.mutate(id)}
              onCreateRoom={(payload) => createRoom.mutate(payload)}
              onDeleteRoom={(id) => deleteRoom.mutate(id)}
              pending={
                createLocation.isPending ||
                deleteLocation.isPending ||
                createRoom.isPending ||
                deleteRoom.isPending
              }
            />
          )}
        </section>
      </section>

      {formOpen ? (
        <ReservationForm
          key={editing?.id ?? 'new-reservation'}
          locations={locations}
          rooms={rooms}
          reservation={editing}
          pending={saveReservation.isPending}
          apiError={formError}
          onCancel={() => {
            setFormOpen(false);
            setEditing(null);
            setFormError(null);
          }}
          onSubmit={(payload) => saveReservation.mutate(payload)}
        />
      ) : null}

      {deleteTarget ? (
        <ConfirmDialog
          title={deleteTarget.type === 'single' ? 'Excluir reserva' : 'Excluir reservas'}
          message={
            deleteTarget.type === 'single'
              ? `Confirmar exclusão da reserva de ${deleteTarget.reservation.responsible}?`
              : `Confirmar exclusão de ${deleteTarget.ids.length} reservas selecionadas?`
          }
          confirmLabel="Excluir"
          pending={deleteReservation.isPending}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={() => deleteReservation.mutate(deleteTarget)}
        />
      ) : null}
    </main>
  );
}
