import { describe, it, expect, vi } from "vitest";
import { useState, type ReactElement } from "react";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SizeControl } from "./SizeControl";
import { LocalizationProviderStandalone } from "../../lib/localization";

function renderJa(ui: ReactElement) {
  return render(
    <LocalizationProviderStandalone initialLanguage="japanese">{ui}</LocalizationProviderStandalone>
  );
}

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
      color="#ff0000"
      onChange={(n) => {
        setSize(n);
        onChange(n);
      }}
    />
  );
}

describe("SizeControl", () => {
  it("shows px unit next to the size value", () => {
    renderJa(<SizeControl tool="pen" size={8} color="#ff0000" onChange={vi.fn()} />);
    expect(screen.getByText("px")).toBeInTheDocument();
    expect(screen.getByLabelText("太さの数値")).toHaveValue(8);
  });

  it("shows effective size hint for highlighter", () => {
    renderJa(<SizeControl tool="highlighter" size={4} color="#ffff00" onChange={vi.fn()} />);
    expect(screen.getByText("ハイライト")).toBeInTheDocument();
    expect(screen.getByText("→ 32px")).toBeInTheDocument();
  });

  it("shows a live size preview bubble while dragging the slider", async () => {
    const user = userEvent.setup();
    renderJa(<SizeControl tool="pen" size={8} color="#ff3b30" onChange={vi.fn()} />);
    const slider = screen.getByLabelText("太さ（画像ピクセル）");
    await user.pointer({ keys: "[MouseLeft>]", target: slider });
    expect(screen.getByRole("status")).toHaveTextContent("8px");
  });

  it("clamps numeric input to the brush size range", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderJa(<StatefulSizeControl initial={8} onChange={onChange} />);

    const input = screen.getByLabelText("太さの数値");
    await user.clear(input);
    await user.type(input, "99");

    expect(onChange).toHaveBeenLastCalledWith(40);
    expect(input).toHaveValue(40);
  });
});
