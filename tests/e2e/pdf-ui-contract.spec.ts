import { expect, test } from '@playwright/test';

const location = { id: 'loc-1', name: 'Matriz Sao Paulo', address: 'Av. Paulista', created_at: new Date().toISOString() };
const room = { id: 'room-1', location_id: 'loc-1', name: 'Sala Aurum', capacity: 12, created_at: new Date().toISOString() };

test('honors PDF UI contract for conflict, hidden coffee fields and bulk delete', async ({ page }) => {
  let reservations = [
    {
      id: 'res-1',
      location_id: location.id,
      room_id: room.id,
      start_at: '2032-05-12T12:00:00.000Z',
      end_at: '2032-05-12T13:00:00.000Z',
      responsible: 'Ana Contrato',
      coffee: true,
      attendees: 8,
      description: 'Reunião de diretoria',
      created_by_user_id: 'user-1',
      created_by_email: 'qa@aurum.test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      location_name: location.name,
      room_name: room.name
    },
    {
      id: 'res-2',
      location_id: location.id,
      room_id: room.id,
      start_at: '2032-05-12T14:00:00.000Z',
      end_at: '2032-05-12T15:00:00.000Z',
      responsible: 'Bruno Contrato',
      coffee: false,
      attendees: null,
      description: 'Planejamento comercial',
      created_by_user_id: 'user-1',
      created_by_email: 'qa@aurum.test',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      location_name: location.name,
      room_name: room.name
    }
  ];

  await page.route('**/api/auth/register', async (route) => {
    await route.fulfill({
      json: {
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        csrfToken: 'csrf-token',
        user: { id: 'user-1', email: 'qa@aurum.test' }
      }
    });
  });
  await page.route('**/api/locations', async (route) => {
    await route.fulfill({ json: [location] });
  });
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({ json: [room] });
  });
  await page.route('**/api/reservations/bulk-delete', async (route) => {
    reservations = [];
    await route.fulfill({ json: { deleted: 2 } });
  });
  await page.route('**/api/reservations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: reservations });
      return;
    }
    await route.fulfill({
      status: 409,
      json: { detail: 'Já existe uma reserva para esta sala neste horário.' }
    });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Criar nova conta' }).click();
  await page.getByLabel('E-mail').fill('qa@aurum.test');
  await page.getByLabel('Senha').fill('StrongPass123!');
  await page.getByRole('button', { name: 'Cadastrar' }).click();

  const table = page.getByRole('table');
  await expect(page.getByRole('heading', { name: 'Reservas de salas' })).toBeVisible();
  await expect(page.getByText('Ana Contrato')).toBeVisible();
  await expect(table).not.toContainText('Café');
  await expect(table).not.toContainText('Quantidade de pessoas');

  await page.getByRole('button', { name: 'Nova reserva' }).click();
  await page.getByLabel('Local / filial').selectOption(location.id);
  await page.getByLabel('Sala').selectOption(room.id);
  await page.getByLabel('Início').fill('2032-05-12T12:30');
  await page.getByLabel('Fim').fill('2032-05-12T13:30');
  await page.getByLabel('Responsável').fill('Conflito Contrato');
  await page.getByRole('button', { name: 'Salvar' }).click();
  await expect(page.getByText('Já existe uma reserva para esta sala neste horário.')).toBeVisible();
  await page.getByRole('button', { name: 'Fechar' }).click();

  await page.getByRole('checkbox', { name: 'Selecionar reserva de Ana Contrato' }).check();
  await page.getByRole('checkbox', { name: 'Selecionar reserva de Bruno Contrato' }).check();
  await page.getByRole('button', { name: 'Excluir 2' }).click();
  await expect(page.getByText('Confirmar exclusão de 2 reservas selecionadas?')).toBeVisible();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByText('Nenhuma reserva cadastrada.')).toBeVisible();
});
