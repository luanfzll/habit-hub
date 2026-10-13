/**
 * Fills the LOCAL database with a demo account and months of history, so the grid
 * can be seen with real-looking data during development. Never run in production.
 *
 *   npm run db:seed   ->  dev@habithub.local / senha-de-dev-123
 */
import "dotenv/config";
import { addDays, eachDay, todayIn, weekdayOf, type CalendarDate } from "@/domain/calendar-date";
import { EVERY_DAY, isScheduledOn, weekdaysFromList } from "@/domain/habit-config";
import type { HabitColor } from "@/generated/prisma/enums";
import { auth } from "@/server/auth";
import { db } from "@/server/db";
import { toDbDate } from "@/server/db-dates";
import { newPublicId } from "@/server/habits/service";

const EMAIL = "dev@habithub.local";
const PASSWORD = "senha-de-dev-123";
const TIMEZONE = "America/Sao_Paulo";

if (process.env.VERCEL_ENV === "production" || process.env.NODE_ENV === "production") {
  throw new Error("The seed only runs against a local database.");
}

// Deterministic pseudo-random numbers, so every seed looks the same.
let state = 42;
function random() {
  state = (state * 1_103_515_245 + 12_345) % 2 ** 31;
  return state / 2 ** 31;
}

interface SeedHabit {
  name: string;
  color: HabitColor;
  unit: string | null;
  daysAgo: number;
  versions: Array<{ daysAgo: number; target: number; weekdays: number }>;
  /** Chance of doing the habit on a scheduled day, and the value when done. */
  rate: number;
  value: (target: number) => number;
  skipChance?: number;
}

const habits: SeedHabit[] = [
  {
    name: "Ler",
    color: "green",
    unit: "páginas",
    daysAgo: 300,
    versions: [{ daysAgo: 300, target: 20, weekdays: EVERY_DAY }],
    rate: 0.78,
    value: (target) => Math.max(1, Math.round(target * (0.3 + random() * 1.1))),
  },
  {
    name: "Academia",
    color: "purple",
    unit: null,
    daysAgo: 200,
    versions: [
      { daysAgo: 200, target: 1, weekdays: weekdaysFromList([1, 3, 5]) },
      { daysAgo: 60, target: 1, weekdays: weekdaysFromList([2, 4, 6]) },
    ],
    rate: 0.85,
    value: () => 1,
    skipChance: 0.05,
  },
  {
    name: "Meditar",
    color: "teal",
    unit: "minutos",
    daysAgo: 90,
    versions: [{ daysAgo: 90, target: 10, weekdays: EVERY_DAY }],
    rate: 0.65,
    value: (target) => Math.max(1, Math.round(target * (0.5 + random() * 0.8))),
  },
  {
    name: "Beber água",
    color: "blue",
    unit: "copos",
    daysAgo: 0,
    versions: [{ daysAgo: 0, target: 8, weekdays: EVERY_DAY }],
    rate: 0,
    value: () => 0,
  },
];

async function main() {
  const today = todayIn(TIMEZONE);
  await db.user.deleteMany({ where: { email: EMAIL } });
  const { user } = await auth.api.signUpEmail({
    body: { email: EMAIL, password: PASSWORD, name: "dev", timezone: TIMEZONE },
  });

  for (const [index, habit] of habits.entries()) {
    const startDate = addDays(today, -habit.daysAgo);
    const versions = habit.versions.map((version) => ({
      effectiveFrom: addDays(today, -version.daysAgo),
      target: version.target,
      weekdays: version.weekdays,
    }));
    const configOn = (date: CalendarDate) => versions.findLast((version) => version.effectiveFrom <= date)!;

    const entries = [];
    for (const date of eachDay(startDate, addDays(today, -1))) {
      const config = configOn(date);
      if (!isScheduledOn(config.weekdays, date)) {
        // Now and then an extra session on a day off.
        if (habit.rate > 0 && weekdayOf(date) === 0 && random() < 0.1) {
          entries.push({ date: toDbDate(date), value: habit.value(config.target), skipped: false });
        }
        continue;
      }
      if (habit.skipChance && random() < habit.skipChance) {
        entries.push({ date: toDbDate(date), value: 0, skipped: true });
      } else if (random() < habit.rate) {
        entries.push({ date: toDbDate(date), value: habit.value(config.target), skipped: false });
      }
    }

    await db.habit.create({
      data: {
        userId: user.id,
        publicId: newPublicId(),
        name: habit.name,
        color: habit.color,
        unit: habit.unit,
        startDate: toDbDate(startDate),
        // Keeps the dashboard order equal to the list above.
        createdAt: new Date(Date.now() - (habits.length - index) * 1000),
        versions: {
          create: versions.map((version) => ({ ...version, effectiveFrom: toDbDate(version.effectiveFrom) })),
        },
        entries: { create: entries },
      },
    });
  }

  console.info(`Seeded ${habits.length} habits for ${EMAIL} (password: ${PASSWORD}).`);
}

main().finally(() => db.$disconnect());
