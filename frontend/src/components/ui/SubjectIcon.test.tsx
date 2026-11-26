import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import SubjectIcon from "./SubjectIcon";

describe("SubjectIcon", () => {
  it("renders SVG icon for matematika", () => {
    const { container } = render(<SubjectIcon name="matematika" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders SVG icon for ort / opt without error", () => {
    const { container } = render(<SubjectIcon name="ort" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });

  it("renders fallback SVG for unknown subject", () => {
    const { container } = render(<SubjectIcon name="unknown-subject" />);
    const svg = container.querySelector("svg");
    expect(svg).toBeInTheDocument();
  });
});
