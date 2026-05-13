import { expect, test, type Page, type TestInfo } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

type TestLocation = {
  id: string;
  name: string;
  address?: string | null;
};

type TestRoom = {
  id: string;
  name?: string;
  location_id?: string;
  capacity?: number;
};

type TestReservation = {
  id: string;
  room_id: string;
  responsible: string;
};

type TestSession = {
  csrfToken: string;
};

function projectEvidenceDir(testInfo: TestInfo) {
  const root = process.env.UI_EVIDENCE_DIR ?? testInfo.outputDir;
  const projectSlug = testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
  return path.join(root, projectSlug);
}

async function capture(page: Page, testInfo: TestInfo, name: string) {
  const dir = projectEvidenceDir(testInfo);
  const filePath = path.join(dir, name);
  await mkdir(path.dirname(filePath), { recursive: true });
  await page.screenshot({ path: filePath, fullPage: true });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth;
    const scrollWidth = Math.max(document.documentElement.scrollWidth, document.body.scrollWidth);
    const offenders = Array.from(document.body.querySelectorAll<HTMLElement>('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id,
          className: element.className.toString(),
          text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80),
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          width: Math.round(rect.width)
        };
      })
      .filter((item) => item.right > viewportWidth + 1 || item.left < -1)
      .slice(0, 8);

    return { viewportWidth, scrollWidth, offenders };
  });

  expect(overflow.scrollWidth, JSON.stringify(overflow, null, 2)).toBeLessThanOrEqual(overflow.viewportWidth + 1);
}

async function captureViewport(page: Page, testInfo: TestInfo, name: string, width: number, height: number) {
  await page.setViewportSize({ width, height });
  await page.evaluate(() => window.scrollTo(0, 0));
  await expectNoHorizontalOverflow(page);
  await capture(page, testInfo, `breakpoints/${name}.png`);
}

async function activateButton(page: Page, name: string, options: { exact?: boolean } = {}) {
  const button = page.getByRole('button', { name, ...options });
  try {
    await button.click({ timeout: 5_000 });
  } catch {
    await button.focus();
    await page.keyboard.press('Enter');
  }
}

async function getSession(page: Page) {
  const response = await page.request.get('/api/auth/session');
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as TestSession;
}

async function deleteIfExists(page: Page, csrfToken: string, url: string) {
  const response = await page.request.delete(url, {
    headers: { 'X-CSRF-Token': csrfToken },
    timeout: 10_000
  });
  expect([204, 404]).toContain(response.status());
}

async function listReservations(page: Page) {
  const response = await page.request.get('/api/reservations', { timeout: 10_000 });
  expect(response.ok()).toBeTruthy();
  return (await response.json()) as TestReservation[];
}

test.describe('manual UI evidence', () => {
  test.skip(!process.env.MANUAL_UI_EVIDENCE, 'Run with MANUAL_UI_EVIDENCE=1 against the Docker stack.');
  test.setTimeout(90_000);

  test('captures login, reservation CRUD, conflict and bulk delete evidence', async ({ page }, testInfo) => {
    const projectSlug = testInfo.project.name.replace(/[^a-z0-9]+/gi, '-').toLowerCase();
    const suffix = `${Date.now()}-${projectSlug}`;
    const email = `evidence-${suffix}@aurum.test`;
    const password = 'StrongPass123!';
    const roomName = `Sala Evidencia ${suffix}`;
    const responsible = `Evidencia UI ${suffix}`;
    const responsibleEdited = `Evidencia UI Editada ${suffix}`;
    const responsibleSecond = `Evidencia UI Lote ${suffix}`;
    const locationName = `Local Evidencia ${suffix}`;
    const locationNameEdited = `Local Evidencia Editado ${suffix}`;
    const roomResourceName = `Sala Recurso ${suffix}`;
    const roomResourceNameEdited = `Sala Recurso Editada ${suffix}`;
    const day = 10 + (Date.now() % 18);
    const datePrefix = `2035-06-${String(day).padStart(2, '0')}`;
    const startAt = `${datePrefix}T09:00`;
    const endAt = `${datePrefix}T10:00`;
    const secondStartIso = `${datePrefix}T11:00:00.000Z`;
    const secondEndIso = `${datePrefix}T12:00:00.000Z`;
    const createdReservationIds: string[] = [];
    let csrfToken: string | null = null;
    let createdRoomId: string | null = null;
    let createdResourceLocationId: string | null = null;
    let createdResourceRoomId: string | null = null;

    try {
      await page.goto('/');
      await capture(page, testInfo, '01-login.png');

      await page.getByRole('button', { name: 'Criar nova conta' }).click();
      await page.getByLabel('E-mail').fill(email);
      await page.getByLabel('Senha').fill(password);
      await capture(page, testInfo, '02-cadastro-preenchido.png');
      await page.getByRole('button', { name: 'Cadastrar' }).click();

      await expect(page.getByRole('heading', { name: 'Reservas de salas' })).toBeVisible();
      await expect.poll(async () => page.evaluate(() => window.localStorage.getItem('aurum-reservation-session'))).toBeNull();
      await capture(page, testInfo, '03-listagem-inicial.png');

      const session = await getSession(page);
      csrfToken = session.csrfToken;
      expect(csrfToken).toBeTruthy();

      const csrfHeaders = { 'X-CSRF-Token': csrfToken };
      const locationsResponse = await page.request.get('/api/locations');
      expect(locationsResponse.ok()).toBeTruthy();
      const locations = (await locationsResponse.json()) as TestLocation[];
      const matriz = locations.find((location) => location.name === 'Matriz Sao Paulo') ?? locations[0];
      expect(matriz).toBeTruthy();

      const roomResponse = await page.request.post('/api/rooms', {
        data: { location_id: matriz.id, name: roomName, capacity: 16 },
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
      await page.getByLabel('Local / filial').selectOption({ label: matriz.name });
      await page.getByLabel('Sala').selectOption({ label: `${roomName} (16)` });
      await page.getByLabel('Início').fill(startAt);
      await page.getByLabel('Fim').fill(endAt);
      await page.getByLabel('Responsável').fill(responsible);
      await page.getByRole('checkbox', { name: 'Café' }).check();
      await page.getByLabel('Quantidade de pessoas').fill('8');
      await page.getByLabel('Descrição').fill('Reserva criada pela evidencia automatizada.');
      await capture(page, testInfo, '04-formulario-nova-reserva.png');
      await activateButton(page, 'Salvar');

      await expect(page.getByText(responsible, { exact: true })).toBeVisible();
      const listAfterCreateResponse = await page.request.get('/api/reservations');
      expect(listAfterCreateResponse.ok()).toBeTruthy();
      const listAfterCreate = (await listAfterCreateResponse.json()) as TestReservation[];
      const createdReservation = listAfterCreate.find((item) => item.responsible === responsible);
      expect(createdReservation).toBeTruthy();
      createdReservationIds.push(createdReservation!.id);
      await capture(page, testInfo, '05-reserva-criada.png');

      await page.getByRole('button', { name: 'Nova reserva' }).click();
      await page.getByLabel('Local / filial').selectOption({ label: matriz.name });
      await page.getByLabel('Sala').selectOption({ label: `${roomName} (16)` });
      await page.getByLabel('Início').fill(startAt);
      await page.getByLabel('Fim').fill(endAt);
      await page.getByLabel('Responsável').fill(`Conflito ${suffix}`);
      await page.getByLabel('Descrição').fill('Tentativa de conflito de horario.');
      await page.getByRole('button', { name: 'Salvar' }).click();
      await expect(page.getByText('Já existe uma reserva ou cadastro conflitante para estes dados.')).toBeVisible();
      await capture(page, testInfo, '06-conflito-horario.png');
      await activateButton(page, 'Cancelar');

      await page.getByRole('button', { name: `Editar reserva de ${responsible}` }).click();
      await expect(page.getByRole('heading', { name: 'Editar reserva' })).toBeVisible();
      await capture(page, testInfo, '07-formulario-edicao.png');
      await page.getByLabel('Responsável').fill(responsibleEdited);
      await page.getByLabel('Descrição').fill('Reserva editada pela evidencia automatizada.');
      await activateButton(page, 'Salvar');
      await expect(page.getByText(responsibleEdited, { exact: true })).toBeVisible();
      await capture(page, testInfo, '08-reserva-editada.png');

      const secondReservationResponse = await page.request.post('/api/reservations', {
        data: {
          location_id: matriz.id,
          room_id: createdRoomId,
          start_at: secondStartIso,
          end_at: secondEndIso,
          responsible: responsibleSecond,
          coffee: false,
          attendees: null,
          description: 'Reserva criada para validar exclusao em lote.'
        },
        headers: csrfHeaders
      });
      expect(secondReservationResponse.ok()).toBeTruthy();
      createdReservationIds.push(((await secondReservationResponse.json()) as TestReservation).id);

      const reservationsRefresh = page.waitForResponse(
        (response) => response.url().includes('/api/reservations') && response.status() === 200
      );
      await page.getByRole('button', { name: 'Atualizar' }).click();
      await reservationsRefresh;
      await expect(page.getByText(responsibleSecond, { exact: true })).toBeVisible();

      await page.getByRole('checkbox', { name: `Selecionar reserva de ${responsibleEdited}` }).check();
      await page.getByRole('checkbox', { name: `Selecionar reserva de ${responsibleSecond}` }).check();
      await expect(page.getByRole('button', { name: 'Excluir 2' })).toBeVisible();
      await capture(page, testInfo, '09-selecao-exclusao-lote.png');

      await activateButton(page, 'Excluir 2');
      await expect(page.getByRole('dialog', { name: 'Excluir reservas' })).toBeVisible();
      await capture(page, testInfo, '10-modal-exclusao-lote.png');
      await activateButton(page, 'Excluir', { exact: true });

      await expect(page.getByText(responsibleEdited, { exact: true })).toHaveCount(0);
      await expect(page.getByText(responsibleSecond, { exact: true })).toHaveCount(0);
      const listAfterBulkDelete = await listReservations(page);
      expect(listAfterBulkDelete.some((item) => item.responsible === responsibleEdited)).toBe(false);
      expect(listAfterBulkDelete.some((item) => item.responsible === responsibleSecond)).toBe(false);
      await capture(page, testInfo, '11-pos-exclusao-lote.png');

      await page.getByRole('tab', { name: 'Locais e salas' }).click();
      const locationsPanel = page.locator('section[aria-labelledby="locations-title"]');
      const roomsPanel = page.locator('section[aria-labelledby="rooms-title"]');
      await expect(locationsPanel.getByRole('heading', { name: 'Locais' })).toBeVisible();
      await expect(roomsPanel.getByRole('heading', { name: 'Salas' })).toBeVisible();
      await capture(page, testInfo, '12-recursos-inicial.png');

      await page.locator('#location-name').fill(locationName);
      await page.locator('#location-address').fill('Rua das Evidencias, 100');
      await capture(page, testInfo, '13-local-formulario-criacao.png');
      await locationsPanel.getByRole('button', { name: 'Adicionar' }).click();
      await expect(locationsPanel.getByText(locationName, { exact: true })).toBeVisible();
      const locationsAfterCreate = (await (await page.request.get('/api/locations')).json()) as TestLocation[];
      createdResourceLocationId = locationsAfterCreate.find((location) => location.name === locationName)?.id ?? null;
      expect(createdResourceLocationId).toBeTruthy();
      await capture(page, testInfo, '14-local-criado.png');

      await page.getByRole('button', { name: `Editar ${locationName}` }).click();
      await page.locator(`[id="location-name-${createdResourceLocationId}"]`).fill(locationNameEdited);
      await page.locator(`[id="location-address-${createdResourceLocationId}"]`).fill('Avenida Evidencia, 200');
      await capture(page, testInfo, '15-local-formulario-edicao.png');
      await page.getByRole('button', { name: `Salvar ${locationName}` }).click();
      await expect(locationsPanel.getByText(locationNameEdited, { exact: true })).toBeVisible();
      await capture(page, testInfo, '16-local-editado.png');

      await page.locator('#room-location').selectOption(createdResourceLocationId!);
      await page.locator('#room-name').fill(roomResourceName);
      await page.locator('#room-capacity').fill('9');
      await capture(page, testInfo, '17-sala-formulario-criacao.png');
      await roomsPanel.getByRole('button', { name: 'Adicionar' }).click();
      await expect(roomsPanel.getByText(roomResourceName, { exact: true })).toBeVisible();
      const roomsAfterCreate = (await (await page.request.get('/api/rooms')).json()) as TestRoom[];
      createdResourceRoomId = roomsAfterCreate.find((room) => room.name === roomResourceName)?.id ?? null;
      expect(createdResourceRoomId).toBeTruthy();
      await capture(page, testInfo, '18-sala-criada.png');

      await page.getByRole('button', { name: `Editar ${roomResourceName}` }).click();
      await page.locator(`[id="room-name-${createdResourceRoomId}"]`).fill(roomResourceNameEdited);
      await page.locator(`[id="room-capacity-${createdResourceRoomId}"]`).fill('11');
      await capture(page, testInfo, '19-sala-formulario-edicao.png');
      await page.getByRole('button', { name: `Salvar ${roomResourceName}` }).click();
      await expect(roomsPanel.getByText(roomResourceNameEdited, { exact: true })).toBeVisible();
      await capture(page, testInfo, '20-sala-editada.png');

      await page.getByRole('button', { name: `Excluir ${roomResourceNameEdited}` }).click();
      await expect(page.getByRole('dialog', { name: 'Excluir sala' })).toBeVisible();
      await capture(page, testInfo, '21-modal-exclusao-sala.png');
      await activateButton(page, 'Excluir', { exact: true });
      await expect(roomsPanel.getByText(roomResourceNameEdited, { exact: true })).toHaveCount(0);
      createdResourceRoomId = null;

      await page.getByRole('button', { name: `Excluir ${locationNameEdited}` }).click();
      await expect(page.getByRole('dialog', { name: 'Excluir local' })).toBeVisible();
      await capture(page, testInfo, '22-modal-exclusao-local.png');
      await activateButton(page, 'Excluir', { exact: true });
      await expect(locationsPanel.getByText(locationNameEdited, { exact: true })).toHaveCount(0);
      createdResourceLocationId = null;
      await capture(page, testInfo, '23-recursos-pos-exclusao.png');

      if (testInfo.project.name === 'chromium') {
        await captureViewport(page, testInfo, '1440-desktop-wide', 1440, 900);
        await captureViewport(page, testInfo, '1024-tablet-landscape', 1024, 768);
        await captureViewport(page, testInfo, '768-tablet-portrait', 768, 900);
        await captureViewport(page, testInfo, '390-mobile', 390, 844);
        await captureViewport(page, testInfo, '320-small-mobile', 320, 740);
      }

      const manifest = {
        generatedAt: new Date().toISOString(),
        project: testInfo.project.name,
        email,
        checks: [
          'login screen',
          'register flow',
          'reservation create',
          'same room/time conflict',
          'reservation edit',
          'bulk delete confirmation',
          'bulk delete result',
          'resource location create/edit/delete',
          'resource room create/edit/delete',
          'successful Playwright video retained under manual UI artifacts',
          'responsive breakpoints'
        ]
      };
      await writeFile(path.join(projectEvidenceDir(testInfo), 'manifest.json'), JSON.stringify(manifest, null, 2));
    } finally {
      if (csrfToken) {
        try {
          if (createdRoomId) {
            const remainingReservations = await listReservations(page);
            for (const reservation of remainingReservations.filter((item) => item.room_id === createdRoomId)) {
              await deleteIfExists(page, csrfToken, `/api/reservations/${reservation.id}`);
            }
          }
          for (const reservationId of createdReservationIds) {
            await deleteIfExists(page, csrfToken, `/api/reservations/${reservationId}`);
          }
          if (createdResourceRoomId) {
            await deleteIfExists(page, csrfToken, `/api/rooms/${createdResourceRoomId}`);
          }
          if (createdRoomId) {
            await deleteIfExists(page, csrfToken, `/api/rooms/${createdRoomId}`);
          }
          if (createdResourceLocationId) {
            await deleteIfExists(page, csrfToken, `/api/locations/${createdResourceLocationId}`);
          }
        } catch (error) {
          const dir = projectEvidenceDir(testInfo);
          await mkdir(dir, { recursive: true });
          await writeFile(
            path.join(dir, 'cleanup-warning.json'),
            JSON.stringify(
              {
                generatedAt: new Date().toISOString(),
                message: error instanceof Error ? error.message : String(error)
              },
              null,
              2
            )
          );
        }
      }
    }
  });
});
