import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SizeControl } from "./SizeControl";

describe("SizeControl", () => {
  it("shows px unit next to the size value", () => {
    render(<SizeControl size={8} onChange={vi.fn()} />);
    expect(screen.getByText("px")).toBeInTheDocument();
    expect(screen.getByDisplayValue("8")).toBeInTheDocument();
  });

  it("clamps numeric input to the brush size range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<SizeControl size={8} onChange={onChange} />);

    const input = screen.getByLabelText("太さの数値（px）");
    await user.clear(input);
    await user.type(input, "99");

    expect(onChange).toHaveBeenLastCalledWith(40);
  });
});
