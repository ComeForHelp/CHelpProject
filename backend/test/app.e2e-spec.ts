/**
 * Сквозной сценарий MVP на настоящей PostgreSQL (DATABASE_URL из .env, миграции применены).
 * Тест создаёт своих пользователей с уникальными телефонами и не трогает чужие данные.
 *
 *   npm run test:e2e
 */
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient, Role, VerificationStatus } from '@prisma/client';
import { hash } from 'bcryptjs';
import { rm } from 'fs/promises';
import { join, resolve } from 'path';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/main';

process.env.CRON_ENABLED = 'false';

const API = '/api/v1';
const PASSWORD = 'password123';
// Уникальный «хвост» телефона на запуск: +7 999 XXXXXXX
const run = String(Date.now()).slice(-6);
const phone = (n: number) => `+7999${n}${run}`;

describe('«Иду на помощь!» — основной сценарий (e2e)', () => {
  let app: INestApplication;
  let http: ReturnType<typeof request>;
  const prisma = new PrismaClient();

  const tokens: Record<string, string> = {};
  const auth = (who: string) => ({ Authorization: `Bearer ${tokens[who]}` });

  let recipientId: string;
  let volunteerId: string;
  let addressId: string;
  let taskId: string;
  let districtId: number;
  let categoryId: number;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();
    http = request(app.getHttpServer());

    // Справочники могут быть пустыми, если seed не запускали.
    const district = await prisma.district.upsert({
      where: { name: 'Ленинский' },
      update: {},
      create: { name: 'Ленинский' },
    });
    const category = await prisma.taskCategory.upsert({
      where: { code: 'groceries' },
      update: {},
      create: { code: 'groceries', name: 'Продукты', needsMoney: true },
    });
    districtId = district.id;
    categoryId = category.id;

    // Координатора самостоятельно не зарегистрировать — создаём напрямую.
    await prisma.user.create({
      data: {
        role: Role.COORDINATOR,
        phone: phone(1),
        passwordHash: await hash(PASSWORD, 10),
        lastName: 'Тестовый',
        firstName: 'Координатор',
        pdConsentAt: new Date(),
      },
    });
  });

  afterAll(async () => {
    const users = await prisma.user.findMany({
      where: { phone: { endsWith: run, startsWith: '+7999' } },
      select: { id: true },
    });
    const ids = users.map((u) => u.id);
    const tasks = await prisma.task.findMany({
      where: { recipientId: { in: ids } },
      select: { id: true },
    });
    const uploadDir = resolve(process.env.UPLOAD_DIR ?? './uploads');
    await Promise.all(
      tasks.map((t) => rm(join(uploadDir, t.id), { recursive: true, force: true })),
    );
    await prisma.task.deleteMany({ where: { recipientId: { in: ids } } });
    await prisma.recurringRule.deleteMany({ where: { recipientId: { in: ids } } });
    await prisma.user.deleteMany({ where: { id: { in: ids } } });
    await prisma.$disconnect();
    await app.close();
  });

  it('справочники доступны без входа', async () => {
    const res = await http.get(`${API}/dictionaries/districts`).expect(200);
    expect(res.body.length).toBeGreaterThan(0);
  });

  it('без согласия на обработку ПД регистрация невозможна', async () => {
    await http
      .post(`${API}/auth/register`)
      .send({
        role: 'RECIPIENT',
        phone: phone(2),
        password: PASSWORD,
        lastName: 'Иванова',
        firstName: 'Мария',
        pdConsent: false,
      })
      .expect(400);
  });

  it('регистрация получателя, родственника и волонтёра; вход координатора', async () => {
    const reg = async (key: string, role: string, n: number, firstName: string) => {
      const res = await http
        .post(`${API}/auth/register`)
        .send({
          role,
          phone: phone(n),
          password: PASSWORD,
          lastName: 'Тест',
          firstName,
          pdConsent: true,
        })
        .expect(201);
      tokens[key] = res.body.accessToken;
      return res.body.user.id as string;
    };
    recipientId = await reg('recipient', 'RECIPIENT', 2, 'Мария');
    await reg('relative', 'RELATIVE', 3, 'Анна');
    volunteerId = await reg('volunteer', 'VOLUNTEER', 4, 'Дмитрий');

    const login = await http
      .post(`${API}/auth/login`)
      .send({ phone: phone(1), password: PASSWORD })
      .expect(200);
    tokens.coord = login.body.accessToken;

    await http
      .post(`${API}/auth/login`)
      .send({ phone: phone(1), password: 'wrong-pass' })
      .expect(401);
  });

  it('refresh-токен одноразовый (ротация)', async () => {
    const login = await http
      .post(`${API}/auth/login`)
      .send({ phone: phone(2), password: PASSWORD });
    const first = login.body.refreshToken;
    await http.post(`${API}/auth/refresh`).send({ refreshToken: first }).expect(200);
    await http.post(`${API}/auth/refresh`).send({ refreshToken: first }).expect(401);
  });

  it('родственник привязывается к подопечному, получатель подтверждает', async () => {
    const req = await http
      .post(`${API}/relatives/links/request`)
      .set(auth('relative'))
      .send({ recipientPhone: phone(2), relation: 'дочь' })
      .expect(201);
    expect(req.body.status).toBe('PENDING');

    // До подтверждения родственник не видит адреса подопечного.
    await http.get(`${API}/addresses?recipientId=${recipientId}`).set(auth('relative')).expect(403);

    await http
      .post(`${API}/relatives/links/${req.body.id}/confirm`)
      .set(auth('recipient'))
      .expect(200);
  });

  it('родственник добавляет адрес и создаёт заявку за подопечного', async () => {
    const addr = await http
      .post(`${API}/addresses`)
      .set(auth('relative'))
      .send({
        recipientId,
        districtId,
        street: 'ул. Светланская',
        house: '45',
        apartment: '12',
        floor: 5,
        hasElevator: false,
        accessNotes: 'домофон 12К',
      })
      .expect(201);
    addressId = addr.body.id;
    expect(addr.body.isDefault).toBe(true);

    const start = new Date(Date.now() + 3600_000);
    const task = await http
      .post(`${API}/tasks`)
      .set(auth('relative'))
      .send({
        recipientId,
        categoryId,
        addressId,
        title: 'Купить продукты',
        windowStart: start.toISOString(),
        windowEnd: new Date(start.getTime() + 3 * 3600_000).toISOString(),
        estimatedCost: 1200,
        paymentMethod: 'CASH_ON_DELIVERY',
        items: [{ name: 'Хлеб' }, { name: 'Молоко', quantity: '2', unit: 'л' }],
      })
      .expect(201);
    taskId = task.body.id;
    expect(task.body.status).toBe('NEW');
    expect(task.body.items).toHaveLength(2);
  });

  it('непроверенный волонтёр не видит каталог', async () => {
    await http.get(`${API}/tasks/catalog`).set(auth('volunteer')).expect(403);
  });

  it('координатор проверяет волонтёра', async () => {
    const pending = await http
      .get(`${API}/volunteers?status=PENDING&q=${phone(4).slice(-7)}`)
      .set(auth('coord'))
      .expect(200);
    expect(pending.body.items.map((v: { id: string }) => v.id)).toContain(volunteerId);

    await http
      .post(`${API}/volunteers/${volunteerId}/verify`)
      .set(auth('coord'))
      .send({ decision: VerificationStatus.VERIFIED })
      .expect(200);
  });

  it('до взятия волонтёр видит только район и улицу, без телефона и квартиры', async () => {
    const catalog = await http
      .get(`${API}/tasks/catalog?allDistricts=true&limit=100`)
      .set(auth('volunteer'))
      .expect(200);
    const card = catalog.body.items.find((t: { id: string }) => t.id === taskId);
    expect(card).toBeDefined();
    expect(card.street).toBeUndefined();
    expect(card.noElevator).toBe(true);

    const detail = await http.get(`${API}/tasks/${taskId}`).set(auth('volunteer')).expect(200);
    expect(detail.body.viewerRelation).toBe('CATALOG');
    expect(detail.body.address.street).toBe('ул. Светланская');
    expect(detail.body.address.house).toBeUndefined();
    expect(detail.body.address.apartment).toBeUndefined();
    expect(detail.body.address.accessNotes).toBeUndefined();
    expect(detail.body.recipient.phone).toBeUndefined();
    expect(detail.body.recipient.lastName).toBeUndefined();
  });

  it('получатель не может отметить свою заявку выполненной', async () => {
    await http.post(`${API}/tasks/${taskId}/done`).set(auth('recipient')).expect(403);
  });

  it('волонтёр берёт заявку и видит полный адрес и телефон', async () => {
    const res = await http.post(`${API}/tasks/${taskId}/take`).set(auth('volunteer')).expect(200);
    expect(res.body.status).toBe('ASSIGNED');
    expect(res.body.address.house).toBe('45');
    expect(res.body.recipient.phone).toBe(phone(2));
    expect(res.body.relatives.map((r: { phone: string }) => r.phone)).toContain(phone(3));

    // Повторно взять нельзя.
    await http.post(`${API}/tasks/${taskId}/take`).set(auth('volunteer')).expect(409);
  });

  it('после начала выполнения отменить нельзя', async () => {
    await http.post(`${API}/tasks/${taskId}/start`).set(auth('volunteer')).expect(200);
    await http
      .post(`${API}/tasks/${taskId}/cancel`)
      .set(auth('recipient'))
      .send({ reason: 'передумала' })
      .expect(409);
  });

  it('волонтёр отмечает покупки, загружает чек и завершает', async () => {
    const items = await http.get(`${API}/tasks/${taskId}/items`).set(auth('volunteer')).expect(200);
    await http
      .patch(`${API}/tasks/${taskId}/items/${items.body[0].id}`)
      .set(auth('volunteer'))
      .send({ isChecked: true })
      .expect(200);
    // Менять название позиции волонтёр не может.
    await http
      .patch(`${API}/tasks/${taskId}/items/${items.body[0].id}`)
      .set(auth('volunteer'))
      .send({ name: 'Торт' })
      .expect(403);

    const png = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(64),
    ]);
    const att = await http
      .post(`${API}/tasks/${taskId}/attachments`)
      .set(auth('volunteer'))
      .field('kind', 'RECEIPT')
      .attach('file', png, { filename: 'чек.png', contentType: 'image/png' })
      .expect(201);
    expect(att.body.mimeType).toBe('image/png');

    // Исполняемый файл под видом картинки не пройдёт.
    await http
      .post(`${API}/tasks/${taskId}/attachments`)
      .set(auth('volunteer'))
      .field('kind', 'RECEIPT')
      .attach('file', Buffer.from('MZ\x90\x00 not really an image at all'), {
        filename: 'virus.png',
        contentType: 'image/png',
      })
      .expect(400);
    await http
      .get(`${API}/tasks/${taskId}/attachments/${att.body.id}/file`)
      .set(auth('recipient'))
      .expect(200)
      .expect('Content-Type', 'image/png');

    await http.post(`${API}/tasks/${taskId}/done`).set(auth('volunteer')).expect(200);
  });

  it('получатель подтверждает и оценивает; рейтинг волонтёра пересчитан', async () => {
    await http
      .post(`${API}/tasks/${taskId}/reviews`)
      .set(auth('recipient'))
      .send({ rating: 5 })
      .expect(409); // ещё не подтверждено

    const res = await http
      .post(`${API}/tasks/${taskId}/confirm`)
      .set(auth('recipient'))
      .expect(200);
    expect(res.body.status).toBe('CONFIRMED');

    await http
      .post(`${API}/tasks/${taskId}/reviews`)
      .set(auth('recipient'))
      .send({ rating: 5, comment: 'Спасибо!' })
      .expect(201);
    await http
      .post(`${API}/tasks/${taskId}/reviews`)
      .set(auth('recipient'))
      .send({ rating: 4 })
      .expect(409); // одна оценка от автора

    const me = await http.get(`${API}/volunteers/me`).set(auth('volunteer')).expect(200);
    expect(me.body.ratingAvg).toBe(5);
    expect(me.body.tasksDone).toBe(1);
  });

  it('журнал статусов полный, получатель получил уведомления', async () => {
    const history = await http.get(`${API}/tasks/${taskId}/history`).set(auth('coord')).expect(200);
    expect(history.body.map((h: { toStatus: string }) => h.toStatus)).toEqual([
      'NEW',
      'ASSIGNED',
      'IN_PROGRESS',
      'DONE',
      'CONFIRMED',
    ]);

    const notes = await http.get(`${API}/notifications`).set(auth('recipient')).expect(200);
    const types = notes.body.items.map((n: { type: string }) => n.type);
    expect(types).toEqual(expect.arrayContaining(['TASK_ASSIGNED', 'TASK_DONE']));
  });

  it('чужая заявка недоступна', async () => {
    const res = await http
      .post(`${API}/auth/register`)
      .send({
        role: 'RECIPIENT',
        phone: phone(5),
        password: PASSWORD,
        lastName: 'Чужой',
        firstName: 'Человек',
        pdConsent: true,
      })
      .expect(201);
    await http
      .get(`${API}/tasks/${taskId}`)
      .set({ Authorization: `Bearer ${res.body.accessToken}` })
      .expect(403);
  });

  it('координатор видит дашборд и отчёт', async () => {
    const dash = await http.get(`${API}/coordinator/dashboard`).set(auth('coord')).expect(200);
    expect(dash.body).toHaveProperty('unassigned');
    const rep = await http.get(`${API}/coordinator/reports`).set(auth('coord')).expect(200);
    expect(rep.body.tasks.byStatus.CONFIRMED).toBeGreaterThanOrEqual(1);
    expect(rep.body.timing.avgResponseMinutes).not.toBeNull();

    await http.get(`${API}/coordinator/dashboard`).set(auth('volunteer')).expect(403);
  });

  it('регулярное поручение: правило и генерация без дублей', async () => {
    const today = new Date().toISOString().slice(0, 10);
    const rule = await http
      .post(`${API}/recurring-rules`)
      .set(auth('recipient'))
      .send({
        categoryId,
        addressId,
        title: 'Хлеб каждый день',
        frequency: 'WEEKLY',
        daysOfWeek: [1, 2, 3, 4, 5, 6, 7],
        timeFrom: '23:00',
        timeTo: '23:59',
        startsOn: today,
        itemsTemplate: [{ name: 'Хлеб' }],
      })
      .expect(201);
    expect(rule.body.nextDates.length).toBeGreaterThan(0);

    await http.post(`${API}/recurring-rules/run`).set(auth('coord')).expect(200);
    const count1 = await prisma.task.count({ where: { recurringRuleId: rule.body.id } });
    await http.post(`${API}/recurring-rules/run`).set(auth('coord')).expect(200);
    const count2 = await prisma.task.count({ where: { recurringRuleId: rule.body.id } });
    expect(count1).toBeGreaterThan(0);
    expect(count2).toBe(count1);
  });

  it('подбор пароля: после 10 попыток в минуту — 429', async () => {
    const attempt = () =>
      http.post(`${API}/auth/login`).send({ phone: phone(9), password: 'guess-guess' });
    for (let i = 0; i < 10; i++) await attempt().expect(401);
    const blocked = await attempt().expect(429);
    expect(blocked.body.message).toMatch(/Слишком много попыток/);

    // Другой номер с того же IP по-прежнему может войти.
    await http
      .post(`${API}/auth/login`)
      .send({ phone: phone(2), password: PASSWORD })
      .expect(200);
  });

  it('блокировка действует сразу, без ожидания истечения токена', async () => {
    await http.post(`${API}/users/${volunteerId}/block`).set(auth('coord')).send({}).expect(200);
    await http.get(`${API}/users/me`).set(auth('volunteer')).expect(401);
  });
});
