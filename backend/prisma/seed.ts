/**
 * Начальные данные: районы Владивостока, виды помощи и тестовые пользователи всех ролей.
 * Запуск: npm run prisma:seed (повторный запуск безопасен — данные не дублируются).
 *
 * Все тестовые пароли: password123. Тестовых пользователей не создаём, если SEED_DEMO=false.
 */
import {
  ContactPreference,
  Frequency,
  LinkStatus,
  PaymentMethod,
  PrismaClient,
  Role,
  TaskStatus,
  Urgency,
  VerificationStatus,
} from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

const DISTRICTS = ['Ленинский', 'Первомайский', 'Первореченский', 'Советский', 'Фрунзенский'];

const CATEGORIES = [
  { code: 'groceries', name: 'Продукты', icon: 'shopping-cart', needsMoney: true, sortOrder: 1 },
  { code: 'medicine', name: 'Лекарства', icon: 'pill', needsMoney: true, sortOrder: 2 },
  { code: 'utilities', name: 'Оплата ЖКХ', icon: 'receipt', needsMoney: true, sortOrder: 3 },
  { code: 'escort', name: 'Сопровождение', icon: 'walk', needsMoney: false, sortOrder: 4 },
  { code: 'delivery', name: 'Доставка', icon: 'package', needsMoney: false, sortOrder: 5 },
  { code: 'other', name: 'Другое', icon: 'dots', needsMoney: false, sortOrder: 6 },
];

const DEMO_PASSWORD = 'password123';

async function seedDictionaries() {
  for (const name of DISTRICTS) {
    await prisma.district.upsert({ where: { name }, update: {}, create: { name } });
  }
  for (const c of CATEGORIES) {
    await prisma.taskCategory.upsert({
      where: { code: c.code },
      update: { name: c.name, icon: c.icon, needsMoney: c.needsMoney, sortOrder: c.sortOrder },
      create: c,
    });
  }
}

async function upsertUser(data: {
  role: Role;
  phone: string;
  lastName: string;
  firstName: string;
  middleName?: string;
  passwordHash: string | null;
}) {
  return prisma.user.upsert({
    where: { phone: data.phone },
    update: {},
    create: { ...data, pdConsentAt: new Date() },
  });
}

async function seedDemo() {
  const passwordHash = await hash(DEMO_PASSWORD, 10);
  const districts = await prisma.district.findMany();
  const district = (name: string) => districts.find((d) => d.name === name)!.id;
  const category = async (code: string) =>
    (await prisma.taskCategory.findUniqueOrThrow({ where: { code } })).id;

  await upsertUser({
    role: Role.ADMIN,
    phone: '+79000000001',
    lastName: 'Админов',
    firstName: 'Алексей',
    passwordHash,
  });
  const coordinator = await upsertUser({
    role: Role.COORDINATOR,
    phone: '+79000000002',
    lastName: 'Координаторова',
    firstName: 'Ольга',
    middleName: 'Игоревна',
    passwordHash,
  });

  const recipient = await upsertUser({
    role: Role.RECIPIENT,
    phone: '+79000000003',
    lastName: 'Иванова',
    firstName: 'Мария',
    middleName: 'Петровна',
    passwordHash,
  });
  await prisma.recipientProfile.upsert({
    where: { userId: recipient.id },
    update: {},
    create: {
      userId: recipient.id,
      mobilityNotes: 'Хожу с тростью, плохо слышу — звонить громко',
      contactPreference: ContactPreference.CALL,
    },
  });

  // Получатель без интернета — зарегистрирован координатором, войти сам не может.
  const offline = await upsertUser({
    role: Role.RECIPIENT,
    phone: '+79000000007',
    lastName: 'Сидоров',
    firstName: 'Николай',
    middleName: 'Васильевич',
    passwordHash: null,
  });
  await prisma.recipientProfile.upsert({
    where: { userId: offline.id },
    update: {},
    create: { userId: offline.id, contactPreference: ContactPreference.CALL },
  });

  const relative = await upsertUser({
    role: Role.RELATIVE,
    phone: '+79000000004',
    lastName: 'Иванова',
    firstName: 'Анна',
    middleName: 'Сергеевна',
    passwordHash,
  });
  await prisma.relativeLink.upsert({
    where: { recipientId_relativeId: { recipientId: recipient.id, relativeId: relative.id } },
    update: {},
    create: {
      recipientId: recipient.id,
      relativeId: relative.id,
      relation: 'дочь',
      status: LinkStatus.CONFIRMED,
    },
  });

  const volunteer = await upsertUser({
    role: Role.VOLUNTEER,
    phone: '+79000000005',
    lastName: 'Петров',
    firstName: 'Дмитрий',
    passwordHash,
  });
  await prisma.volunteerProfile.upsert({
    where: { userId: volunteer.id },
    update: {},
    create: {
      userId: volunteer.id,
      verificationStatus: VerificationStatus.VERIFIED,
      verifiedById: coordinator.id,
      verifiedAt: new Date(),
      hasCar: true,
      about: 'Студент ДВФУ, свободен по вечерам',
      districts: {
        create: [{ districtId: district('Ленинский') }, { districtId: district('Фрунзенский') }],
      },
    },
  });

  const pendingVolunteer = await upsertUser({
    role: Role.VOLUNTEER,
    phone: '+79000000006',
    lastName: 'Смирнова',
    firstName: 'Екатерина',
    passwordHash,
  });
  await prisma.volunteerProfile.upsert({
    where: { userId: pendingVolunteer.id },
    update: {},
    create: {
      userId: pendingVolunteer.id,
      about: 'Хочу помогать соседям',
      districts: { create: [{ districtId: district('Первомайский') }] },
    },
  });

  // Адреса и заявки создаём только при первом запуске.
  if (await prisma.address.count({ where: { userId: recipient.id } })) return;

  const home = await prisma.address.create({
    data: {
      userId: recipient.id,
      label: 'Дом',
      districtId: district('Ленинский'),
      street: 'ул. Светланская',
      house: '45',
      apartment: '12',
      entrance: '2',
      floor: 5,
      hasElevator: false,
      accessNotes: '80 ступеней от остановки «Лицей», домофон 12К',
      isDefault: true,
    },
  });
  await prisma.address.create({
    data: {
      userId: offline.id,
      label: 'Дом',
      districtId: district('Первореченский'),
      street: 'ул. Русская',
      house: '17',
      apartment: '40',
      floor: 3,
      hasElevator: false,
      isDefault: true,
    },
  });

  const now = Date.now();
  const h = (hours: number) => new Date(now + hours * 3600_000);

  const open = await prisma.task.create({
    data: {
      recipientId: recipient.id,
      createdById: recipient.id,
      categoryId: await category('groceries'),
      addressId: home.id,
      title: 'Купить продукты',
      description: 'Можно в «Самбери» на Светланской',
      urgency: Urgency.NORMAL,
      windowStart: h(20),
      windowEnd: h(24),
      estimatedCost: 1200,
      paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
      items: {
        create: [
          { name: 'Хлеб бородинский', quantity: '1', unit: 'шт', position: 0 },
          { name: 'Молоко 2,5%', quantity: '2', unit: 'л', position: 1 },
          { name: 'Гречка', quantity: '1', unit: 'кг', position: 2 },
        ],
      },
      statusHistory: { create: { toStatus: TaskStatus.NEW, changedById: recipient.id } },
    },
  });

  await prisma.task.create({
    data: {
      recipientId: recipient.id,
      createdById: relative.id,
      volunteerId: volunteer.id,
      categoryId: await category('medicine'),
      addressId: home.id,
      title: 'Лекарства по рецепту',
      urgency: Urgency.URGENT,
      status: TaskStatus.ASSIGNED,
      windowStart: h(2),
      windowEnd: h(6),
      estimatedCost: 800,
      paymentMethod: PaymentMethod.TRANSFER,
      acceptedAt: new Date(),
      items: { create: [{ name: 'Эналаприл 10 мг', quantity: '1', unit: 'уп', position: 0 }] },
      statusHistory: {
        create: [
          { toStatus: TaskStatus.NEW, changedById: relative.id },
          { fromStatus: TaskStatus.NEW, toStatus: TaskStatus.ASSIGNED, changedById: volunteer.id },
        ],
      },
    },
  });

  await prisma.recurringRule.create({
    data: {
      recipientId: recipient.id,
      createdById: relative.id,
      categoryId: await category('medicine'),
      addressId: home.id,
      preferredVolunteerId: volunteer.id,
      title: 'Лекарства из аптеки',
      itemsTemplate: [{ name: 'Эналаприл 10 мг', quantity: '1', unit: 'уп' }],
      frequency: Frequency.WEEKLY,
      daysOfWeek: [2],
      timeFrom: new Date('1970-01-01T10:00:00.000Z'),
      timeTo: new Date('1970-01-01T13:00:00.000Z'),
      startsOn: new Date(new Date().toISOString().slice(0, 10) + 'T00:00:00.000Z'),
      paymentMethod: PaymentMethod.TRANSFER,
      estimatedCost: 800,
    },
  });

  console.log(`Тестовая открытая заявка: ${open.id}`);
}

async function main() {
  await seedDictionaries();
  if (process.env.SEED_DEMO !== 'false') await seedDemo();
  console.log('Seed выполнен. Тестовые входы (пароль password123):');
  console.log('  +79000000001 админ, +79000000002 координатор, +79000000003 получатель,');
  console.log(
    '  +79000000004 родственник, +79000000005 волонтёр, +79000000006 волонтёр на проверке',
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
