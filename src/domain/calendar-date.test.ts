import { describe, expect, it } from "vitest";
import {
  addDays,
  daysBetween,
  eachDay,
  isValidTimeZone,
  parseCalendarDate,
  startOfWeek,
  todayIn,
  weekdayOf,
} from "./calendar-date";

const d = parseCalendarDate;

describe("parseCalendarDate", () => {
  it("accepts real dates", () => {
    expect(d("2026-10-13")).toBe("2026-10-13");
    expect(d("2028-02-29")).toBe("2028-02-29");
  });

  it.each(["2026-02-30", "2027-02-29", "2026-13-01", "2026-1-01", "13/10/2026", ""])("rejects %j", (value) => {
    expect(() => d(value)).toThrow(RangeError);
  });
});

describe("date arithmetic", () => {
  it("crosses month, year and leap-day boundaries", () => {
    expect(addDays(d("2026-12-31"), 1)).toBe("2027-01-01");
    expect(addDays(d("2028-03-01"), -1)).toBe("2028-02-29");
    expect(addDays(d("2026-10-13"), -365)).toBe("2025-10-13");
  });

  it("is not affected by daylight saving transitions", () => {
    // Brazil used DST until 2019; clocks jumped on 2018-11-04.
    expect(addDays(d("2018-11-03"), 1)).toBe("2018-11-04");
    expect(daysBetween(d("2018-11-01"), d("2018-11-10"))).toBe(9);
  });

  it("knows the weekday", () => {
    expect(weekdayOf(d("2026-10-11"))).toBe(0); // Sunday
    expect(weekdayOf(d("2026-10-13"))).toBe(2); // Tuesday
  });

  it("finds the start of the week", () => {
    expect(startOfWeek(d("2026-10-13"))).toBe("2026-10-11");
    expect(startOfWeek(d("2026-10-11"))).toBe("2026-10-11");
    expect(startOfWeek(d("2026-10-13"), 1)).toBe("2026-10-12");
  });

  it("iterates days inclusively", () => {
    expect([...eachDay(d("2026-12-30"), d("2027-01-02"))]).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
    expect([...eachDay(d("2026-10-13"), d("2026-10-12"))]).toEqual([]);
  });
});

describe("todayIn", () => {
  // 2026-10-14 01:30 UTC
  const instant = new Date("2026-10-14T01:30:00Z");

  it("uses the given time zone, not the machine's", () => {
    expect(todayIn("UTC", instant)).toBe("2026-10-14");
    expect(todayIn("America/Sao_Paulo", instant)).toBe("2026-10-13");
    expect(todayIn("Asia/Tokyo", instant)).toBe("2026-10-14");
    expect(todayIn("Pacific/Kiritimati", new Date("2026-10-13T10:30:00Z"))).toBe("2026-10-14");
  });

  it("turns at midnight", () => {
    expect(todayIn("America/Sao_Paulo", new Date("2026-10-14T02:59:59Z"))).toBe("2026-10-13");
    expect(todayIn("America/Sao_Paulo", new Date("2026-10-14T03:00:00Z"))).toBe("2026-10-14");
  });
});

describe("isValidTimeZone", () => {
  it("accepts IANA names and rejects anything else", () => {
    expect(isValidTimeZone("America/Sao_Paulo")).toBe(true);
    expect(isValidTimeZone("Not/AZone")).toBe(false);
    expect(isValidTimeZone("")).toBe(false);
  });
});
