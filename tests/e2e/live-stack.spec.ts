import { expect, test } from '@playwright/test';

type TestLocation = {
  id: string;
  name: string;
};

type TestRoom = {
  id: string;
};

type TestSession = {
  csrfToken: string;
};

test.describe('live stack', () => {
  test.skip(!process.env.LIVE_E2E, 'Requires docker compose stack and LIVE_E2E=1.');

  test('full stack user reserves a seeded room and deletes it', async ({ page }, testInfo) => {
    const projectSlug = testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const suffix = `${Date.now()}-${projectSlug}`;
    const email = `qa-${suffix}@aurum.test`;
    const responsible = `Responsavel ${suffix}`;
    const roomName = `Sala E2E ${suffix}`;
    const day = 10 + (Date.now() % 18);
    const hour = testInfo.project.name === 'mobile-chrome' ? 10 : 8;
    const startAt = `2031-05-${String(day).padStart(2, '0')}T${String(hour).padStart(2, '0')}:00`;
    const endAt = `2031-05-${String(day).padStart(2, '0')}T${String(hour + 1).padStart(2, '0')}:00`;
    let session: TestSession | null = null;
    let createdRoomId: string | null = null;

    try {
      await page.goto('/');
      await page.getByRole('button', { name: 'Criar nova conta' }).click();
      await page.getByLabel('E-mail').fill(email);
      await page.getByLabel('Senha').fill('StrongPass123!');
      await page.getByRole('button', { name: 'Cadastrar' }).click();

      await expect(page.getByRole('heading', { name: 'Reservas de salas' })).toBeVisible();
      await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('aurum-reservation-session'))).toBeNull();
      const cookies = await page.context().cookies();
      expect(cookies.some((cookie) => cookie.name.endsWith('aurum_access') && cookie.httpOnly)).toBeTruthy();
      expect(cookies.some((cookie) => cookie.name.endsWith('aurum_refresh') && cookie.httpOnly)).toBeTruthy();

      const sessionResponse = await page.request.get('/api/auth/session');
      expect(sessionResponse.ok()).toBeTruthy();
      session = (await sessionResponse.json()) as TestSession;
      expect(session.csrfToken).toBeTruthy();

      const csrfHeaders = { 'X-CSRF-Token': session.csrfToken };
      const locationsResponse = await page.request.get('/api/locations');
      expect(locationsResponse.ok()).toBeTruthy();
      const locations = (await locationsResponse.json()) as TestLocation[];
      const matriz = locations.find((location) => location.name === 'Matriz Sao Paulo');
      expect(matriz).toBeTruthy();

      const roomResponse = await page.request.post('/api/rooms', {
        data: { location_id: matriz?.id, name: roomName, capacity: 12 },
        headers: csrfHeaders
      });
      expect(roomResponse.ok()).toBeTruthy();
      createdRoomId = ((await roomResponse.json()) as TestRoom).id;

      const roomsRefresh = page.waitForResponse(
        (response) => response.url().includes('/api/rooms') && response.status() === 200
      );
      await page.getByRole('button', { name: 'Atualizar' }).click();
      await roomsRefresh;

      await page.getByRole('button', { name: 'Nova reserva' }).click();
      await page.getByLabel('Local / filial').selectOption({ label: 'Matriz Sao Paulo' });
      await page.getByLabel('Sala').selectOption({ label: `${roomName} (12)` });
      await page.getByLabel('Início').fill(startAt);
      await page.getByLabel('Fim').fill(endAt);
      await page.getByLabel('Responsável').fill(responsible);
      await page.getByLabel('Descrição').fill('E2E full stack');
      await page.getByRole('button', { name: 'Salvar' }).click();

      await expect(page.getByText(responsible, { exact: true })).toBeVisible();
      await page.getByRole('button', { name: `Excluir reserva de ${responsible}` }).click();
      await page.getByRole('button', { name: 'Excluir', exact: true }).click();
      await expect(page.getByText(responsible, { exact: true })).toHaveCount(0);
    } finally {
      if (session?.csrfToken && createdRoomId) {
        await page.request.delete(`/api/rooms/${createdRoomId}`, {
          headers: { 'X-CSRF-Token': session.csrfToken }
        });
      }
    }
  });
});
