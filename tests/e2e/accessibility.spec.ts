import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

const locations = [
  { id: 'loc-1', name: 'Matriz Sao Paulo', address: 'Av. Paulista', created_at: '2026-05-12T00:00:00.000Z' }
];
const rooms = [
  { id: 'room-1', location_id: 'loc-1', name: 'Sala Aurum', capacity: 12, created_at: '2026-05-12T00:00:00.000Z' }
];
const reservations = [
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
    created_at: '2026-05-12T00:00:00.000Z',
    updated_at: '2026-05-12T00:00:00.000Z',
    location_name: 'Matriz Sao Paulo',
    room_name: 'Sala Aurum'
  }
];

async function expectNoAxeViolations(page: Page) {
  const results = await new AxeBuilder({ page }).analyze();
  expect(results.violations).toEqual([]);
}

async function mockSession(page: Page, status: 'anonymous' | 'authenticated') {
  await page.route('**/api/auth/session', async (route) => {
    if (status === 'anonymous') {
      await route.fulfill({ status: 401, json: { message: 'Sessão expirada.' } });
      return;
    }
    await route.fulfill({
      json: {
        expiresAt: new Date(Date.now() + 60_000).toISOString(),
        csrfToken: 'csrf-token',
        user: { id: 'user-1', email: 'qa@aurum.test' }
      }
    });
  });
}

async function mockReservationData(page: Page) {
  await page.route('**/api/locations', async (route) => {
    await route.fulfill({ json: locations });
  });
  await page.route('**/api/rooms', async (route) => {
    await route.fulfill({ json: rooms });
  });
  await page.route('**/api/reservations', async (route) => {
    await route.fulfill({ json: reservations });
  });
  await page.route('**/api/reservations/res-1', async (route) => {
    await route.fulfill({ status: 204 });
  });
}

test.describe('accessibility', () => {
  test('login screen has no axe violations', async ({ page }) => {
    await mockSession(page, 'anonymous');

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Entrar' })).toBeVisible();

    await expectNoAxeViolations(page);
  });

  test('dashboard has no axe violations', async ({ page }) => {
    await mockSession(page, 'authenticated');
    await mockReservationData(page);

    await page.goto('/');
    await expect(page.getByRole('heading', { name: 'Reservas de salas' })).toBeVisible();

    await expectNoAxeViolations(page);
  });

  test('reservation dialog has no axe violations', async ({ page }) => {
    await mockSession(page, 'authenticated');
    await mockReservationData(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Nova reserva' }).click();
    await expect(page.getByRole('dialog', { name: 'Nova reserva' })).toBeVisible();

    await expectNoAxeViolations(page);
  });

  test('confirmation dialog has no axe violations', async ({ page }) => {
    await mockSession(page, 'authenticated');
    await mockReservationData(page);

    await page.goto('/');
    await page.getByRole('button', { name: 'Excluir reserva de Maria Silva' }).click();
    await expect(page.getByRole('dialog', { name: 'Excluir reserva' })).toBeVisible();

    await expectNoAxeViolations(page);
  });
});
