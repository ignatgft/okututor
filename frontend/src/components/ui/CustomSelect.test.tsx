import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import CustomSelect from "./CustomSelect";

describe("CustomSelect", () => {
  const options = [
    { value: "", label: "Все предметы" },
    { value: "math", label: "Математика" },
    { value: "physics", label: "Физика" },
  ];

  it("renders trigger button with placeholder when no value is selected", () => {
    render(<CustomSelect value="" onChange={vi.fn()} options={options} placeholder="Все предметы" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Все предметы");
  });

  it("renders selected option label", () => {
    render(<CustomSelect value="math" onChange={vi.fn()} options={options} placeholder="Все предметы" />);
    expect(screen.getByRole("combobox")).toHaveTextContent("Математика");
  });

  it("opens listbox on click and allows selecting an option", () => {
    const handleChange = vi.fn();
    render(<CustomSelect value="" onChange={handleChange} options={options} placeholder="Все предметы" />);

    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);

    expect(screen.getByRole("listbox")).toBeInTheDocument();
    const option = screen.getByRole("option", { name: "Физика" });
    fireEvent.click(option);

    expect(handleChange).toHaveBeenCalledWith("physics");
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });

  it("closes dropdown on Escape key", () => {
    render(<CustomSelect value="" onChange={vi.fn()} options={options} placeholder="Все предметы" />);
    const trigger = screen.getByRole("combobox");
    fireEvent.click(trigger);
    expect(screen.getByRole("listbox")).toBeInTheDocument();

    fireEvent.keyDown(trigger, { key: "Escape" });
    expect(screen.queryByRole("listbox")).not.toBeInTheDocument();
  });
});
