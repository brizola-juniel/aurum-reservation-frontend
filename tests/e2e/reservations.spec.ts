import { expect, test } from '@playwright/test';

test('registers, creates, edits and deletes a reservation with mocked APIs', async ({ page }) => {
  const locations = [
    { id: 'loc-1', name: 'Matriz Sao Paulo', address: 'Av. Paulista', created_at: new Date().toISOString() }
  ];
  const rooms = [
    { id: 'room-1', location_id: 'loc-1', name: 'Sala Aurum', capacity: 12, created_at: new Date().toISOString() }
  ];
  let reservations: unknown[] = [];

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
    await route.fulfill({ json: locations });
  });
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({ json: rooms });
  });
  await page.route('**/api/reservations', async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({ json: reservations });
      return;
    }

    reservations = [
      {
        id: 'res-1',
        location_id: 'loc-1',
        room_id: 'room-1',
        start_at: '2026-05-12T12:00:00.000Z',
        end_at: '2026-05-12T13:00:00.000Z',
        responsible: 'Maria Silva',
        coffee: true,
        attendees: 8,
        description: 'Planejamento',
        created_by_user_id: 'user-1',
        created_by_email: 'qa@aurum.test',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        location_name: 'Matriz Sao Paulo',
        room_name: 'Sala Aurum'
      }
    ];
    await route.fulfill({ status: 201, json: reservations[0] });
  });
  await page.route('**/api/reservations/res-1', async (route) => {
    if (route.request().method() === 'PUT') {
      reservations = [{ ...(reservations[0] as object), responsible: 'Maria Oliveira' }];
      await route.fulfill({ json: reservations[0] });
      return;
    }
    reservations = [];
    await route.fulfill({ status: 204 });
  });

  await page.goto('/');
  await page.getByRole('button', { name: 'Criar nova conta' }).click();
  await page.getByLabel('E-mail').fill('qa@aurum.test');
  await page.getByLabel('Senha').fill('StrongPass123!');
  await page.getByRole('button', { name: 'Cadastrar' }).click();

  await expect(page.getByRole('heading', { name: 'Reservas de salas' })).toBeVisible();
  await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('aurum-reservation-session'))).toBeNull();
  await page.getByRole('button', { name: 'Nova reserva' }).click();
  await page.getByLabel('Local / filial').selectOption('loc-1');
  await page.getByLabel('Sala').selectOption('room-1');
  await page.getByLabel('Responsável').fill('Maria Silva');
  await page.getByRole('checkbox', { name: 'Café' }).check();
  await page.getByLabel('Quantidade de pessoas').fill('8');
  await page.getByLabel('Descrição').fill('Planejamento');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Maria Silva', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Editar reserva de Maria Silva' }).click();
  await page.getByLabel('Responsável').fill('Maria Oliveira');
  await page.getByRole('button', { name: 'Salvar' }).click();

  await expect(page.getByText('Maria Oliveira', { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Excluir reserva de Maria Oliveira' }).click();
  await page.getByRole('button', { name: 'Excluir', exact: true }).click();
  await expect(page.getByText('Nenhuma reserva cadastrada.')).toBeVisible();
});
