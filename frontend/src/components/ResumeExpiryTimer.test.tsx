import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import ResumeExpiryTimer from "./ResumeExpiryTimer";

// mock i18n
vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, fb: string) => fb }),
}));

describe("ResumeExpiryTimer", () => {
  it("renders no expiry when null", () => {
    const { container } = render(<ResumeExpiryTimer expiresAt={null} />);
    expect(container.textContent).toContain("Без срока");
  });

  it("renders expired when past", () => {
    const past = new Date(Date.now() - 1000 * 60 * 60).toISOString();
    render(<ResumeExpiryTimer expiresAt={past} />);
    expect(screen.getByText("Истекло")).toBeInTheDocument();
  });

  it("renders countdown when future", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 5).toISOString();
    const published = new Date(Date.now() - 1000 * 60 * 60 * 24 * 10).toISOString();
    const { container } = render(<ResumeExpiryTimer expiresAt={future} publishedAt={published} />);
    // should contain days/hours
    expect(container.textContent).toMatch(/д|ч|мин/);
  });

  it("compact renders short", () => {
    const future = new Date(Date.now() + 1000 * 60 * 60 * 24 * 2).toISOString();
    const { container } = render(<ResumeExpiryTimer expiresAt={future} compact />);
    expect(container.textContent).toMatch(/д|ч/);
  });
});
