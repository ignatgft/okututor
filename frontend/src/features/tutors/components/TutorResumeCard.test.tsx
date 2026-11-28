import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import TutorResumeCard from "./TutorResumeCard";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, fb: string) => fb }),
}));

vi.mock("../../../hooks/useFavorites", () => ({
  useFavoriteIds: () => ({ data: [] }),
  useToggleFavorite: () => ({ mutate: vi.fn() }),
}));

vi.mock("../../../hooks/useContactTutor", () => ({
  default: () => ({ contact: vi.fn(), isLoading: false, error: null }),
}));

vi.mock("../../../store/authStore", () => ({
  default: () => ({ isAuthenticated: false }),
}));

vi.mock("../../../components/ui/Toast", () => ({
  useToast: () => ({ success: vi.fn(), error: vi.fn() }),
}));

describe("TutorResumeCard", () => {
  it("does not display fake verified badge when not verified", () => {
    const tutor = {
      id: "123",
      slug: "ivan-ivanov",
      first_name: "Иван",
      last_name: "Иванов",
      is_verified: false,
    };

    render(
      <MemoryRouter>
        <TutorResumeCard tutor={tutor} />
      </MemoryRouter>
    );

    expect(screen.queryByText("Подтверждён")).not.toBeInTheDocument();
  });

  it("displays verified badge when verified is explicitly true", () => {
    const tutor = {
      id: "123",
      slug: "ivan-ivanov",
      first_name: "Иван",
      last_name: "Иванов",
      is_verified: true,
    };

    render(
      <MemoryRouter>
        <TutorResumeCard tutor={tutor} />
      </MemoryRouter>
    );

    expect(screen.getByText("Подтверждён")).toBeInTheDocument();
  });

  it("does not display fake 5 years experience when omitted", () => {
    const tutor = {
      id: "123",
      slug: "ivan-ivanov",
      first_name: "Иван",
      last_name: "Иванов",
    };

    render(
      <MemoryRouter>
        <TutorResumeCard tutor={tutor} />
      </MemoryRouter>
    );

    expect(screen.getByText("Не указан")).toBeInTheDocument();
    expect(screen.queryByText("5 лет")).not.toBeInTheDocument();
  });

  it("displays proper experience declension when provided", () => {
    const tutor = {
      id: "123",
      slug: "ivan-ivanov",
      first_name: "Иван",
      last_name: "Иванов",
      experience_years: 3,
    };

    render(
      <MemoryRouter>
        <TutorResumeCard tutor={tutor} />
      </MemoryRouter>
    );

    expect(screen.getByText("3 года")).toBeInTheDocument();
  });

  it("does not display fake 800 price when omitted", () => {
    const tutor = {
      id: "123",
      slug: "ivan-ivanov",
      first_name: "Иван",
      last_name: "Иванов",
    };

    render(
      <MemoryRouter>
        <TutorResumeCard tutor={tutor} />
      </MemoryRouter>
    );

    expect(screen.getByText("По договоренности")).toBeInTheDocument();
    expect(screen.queryByText(/800/)).not.toBeInTheDocument();
  });

  it("uses canonical /tutor/:slug link and not legacy /repetitor/...", () => {
    const tutor = {
      id: "abc-456",
      slug: "anna-petrova",
      first_name: "Анна",
      last_name: "Петрова",
    };

    const { container } = render(
      <MemoryRouter>
        <TutorResumeCard tutor={tutor} />
      </MemoryRouter>
    );

    const links = container.querySelectorAll("a");
    const hrefs = Array.from(links).map((a) => a.getAttribute("href"));
    expect(hrefs).toContain("/tutor/anna-petrova");
    expect(hrefs.some((h) => h?.includes("/repetitor/"))).toBe(false);
  });
});
