import { describe, it, expect } from "vitest";
import {
  normalizePhone,
  isValidKyrgyzPhone,
  isValidPriceRange,
  isValidExperience,
  normalizeTelegram
} from "./validation";

describe("Validation utilities (PATTERNS_AND_REUSE)", () => {
  it("normalizes and validates Kyrgyz phone numbers", () => {
    expect(normalizePhone("+996 555 12-34-56")).toBe("+996555123456");
    expect(normalizePhone("0555123456")).toBe("+996555123456");
    expect(normalizePhone("996777112233")).toBe("+996777112233");

    expect(isValidKyrgyzPhone("+996555123456")).toBe(true);
    expect(isValidKyrgyzPhone("0555 12 34 56")).toBe(true);
    expect(isValidKyrgyzPhone("+79991234567")).toBe(false); // Russia
    expect(isValidKyrgyzPhone("12345")).toBe(false);
    expect(isValidKyrgyzPhone("")).toBe(false);
  });

  it("validates price ranges", () => {
    expect(isValidPriceRange(500, 1000)).toBe(true);
    expect(isValidPriceRange("500", "1000")).toBe(true);
    expect(isValidPriceRange(500, 500)).toBe(true);
    expect(isValidPriceRange(500, null)).toBe(true);
    expect(isValidPriceRange(null, 1000)).toBe(true);
    expect(isValidPriceRange(1000, 500)).toBe(false); // from > to
    expect(isValidPriceRange(-10, 500)).toBe(false); // negative
    expect(isValidPriceRange("abc", 500)).toBe(false);
  });

  it("validates experience years", () => {
    expect(isValidExperience(0)).toBe(true);
    expect(isValidExperience(10)).toBe(true);
    expect(isValidExperience(60)).toBe(true);
    expect(isValidExperience("")).toBe(true);
    expect(isValidExperience(-1)).toBe(false);
    expect(isValidExperience(65)).toBe(false);
    expect(isValidExperience("abc")).toBe(false);
  });

  it("normalizes Telegram usernames", () => {
    expect(normalizeTelegram("@my_tutor")).toBe("my_tutor");
    expect(normalizeTelegram("https://t.me/my_tutor")).toBe("my_tutor");
    expect(normalizeTelegram("t.me/my_tutor")).toBe("my_tutor");
    expect(normalizeTelegram("my_tutor")).toBe("my_tutor");
  });
});
