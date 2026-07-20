import { describe, it, expect, vi } from "vitest";
import { useState } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SizeControl } from "./SizeControl";

function StatefulSizeControl({
  initial,
  onChange,
}: {
  initial: number;
  onChange: (n: number) => void;
}) {
  const [size, setSize] = useState(initial);
  return (
    <SizeControl
      tool="pen"
      size={size}
      onChange={(n) => {
        setSize(n);
        onChange(n);
      }}
    />
  );
}

describe("SizeControl", () => {
  it("shows px unit next to the size value", () => {
    render(<SizeControl tool="pen" size={8} onChange={vi.fn()} />);
    expect(screen.getByText("px")).toBeInTheDocument();
    expect(screen.getByLabelText("太さの数値")).toHaveValue(8);
  });

  it("shows effective size hint for highlighter", () => {
    render(<SizeControl tool="highlighter" size={4} onChange={vi.fn()} />);
    expect(screen.getByText("ハイライト")).toBeInTheDocument();
    expect(screen.getByText("→ 32px")).toBeInTheDocument();
  });

  it("clamps numeric input to the brush size range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<StatefulSizeControl initial={8} onChange={onChange} />);

    const input = screen.getByLabelText("太さの数値");
    await user.clear(input);
    await user.type(input, "99");

    expect(onChange).toHaveBeenLastCalledWith(40);
    expect(input).toHaveValue(40);
  });
});
