import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import PgAdminMetrics from "./PgAdminMetrics";

vi.mock("react-i18next", () => ({
  useTranslation: () => ({ t: (_k: string, fb: string) => fb }),
}));

vi.mock("../components/pageTitleContext", () => ({
  usePageTitle: () => vi.fn(),
}));

vi.mock("../api/admin.api", () => ({
  adminApi: {
    metricsOverview: () =>
      Promise.resolve({
        response: { ok: true, status: 200 },
        data: {
          total_users: 150,
          published_tutor_profiles: 45,
          pending_tutor_profiles: 8,
          active_tutor_profiles: 42,
          expiring_soon_tutor_profiles: 5,
          total_tutor_requests: 89,
        },
      }),
    systemResources: () =>
      Promise.resolve({
        response: { ok: true, status: 200 },
        data: {
          jvm: { heapUsedBytes: 1000000, heapMaxBytes: 4000000, usedMemoryBytes: 2000000, maxMemoryBytes: 8000000, threadCount: 15, uptimeHuman: "2h" },
          os: { name: "Linux", arch: "amd64", cpuLoad: 0.1, processCpuLoad: 0.05 },
          disk: { usedBytes: 500000000, totalBytes: 2000000000 },
        },
      }),
  },
}));

describe("PgAdminMetrics", () => {
  it("renders real platform KPI metrics and excludes fake revenue or active-24h", async () => {
    render(<PgAdminMetrics />);

    // Wait for async load
    expect(await screen.findByText("Пользователи")).toBeInTheDocument();
    expect(screen.getByText("Опубликовано анкет")).toBeInTheDocument();
    expect(screen.getByText("Очередь модерации")).toBeInTheDocument();
    expect(screen.getByText("Активные анкеты")).toBeInTheDocument();
    expect(screen.getByText("Истекают скоро (7 дн)")).toBeInTheDocument();
    expect(screen.getByText("Обращения")).toBeInTheDocument();

    // Verify numbers
    expect(screen.getByText("150")).toBeInTheDocument();
    expect(screen.getByText("45")).toBeInTheDocument();
    expect(screen.getByText("8")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("89")).toBeInTheDocument();

    // MUST NOT contain revenue or fake 24h
    expect(screen.queryByText(/Revenue/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Выручка/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Active \(24h\)/i)).not.toBeInTheDocument();
  });
});
