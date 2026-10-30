// @vitest-environment jsdom
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import en from "@/i18n/messages/en.json";
import { HEAT_MS, TURN_MS, TurboKey } from "./TurboKey";

function setup(ended = false) {
  const onTurboChange = vi.fn(),
    onReplay = vi.fn();
  const ui = (e: boolean) => (
    <NextIntlClientProvider locale="en" messages={en}>
      <TurboKey ended={e} onTurboChange={onTurboChange} onReplay={onReplay} />
    </NextIntlClientProvider>
  );
  const r = render(ui(ended));
  const key = screen.getByRole("button");
  return { key, onTurboChange, onReplay, end: () => r.rerender(ui(true)) };
}
const wait = (ms: number) => act(() => vi.advanceTimersByTime(ms));

describe("TurboKey", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("a press released before the heat-up never turns turbo on", () => {
    const { key, onTurboChange } = setup();
    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });
    expect(key.dataset.state).toBe("heating");
    wait(HEAT_MS - 50);
    fireEvent.pointerUp(key, { pointerId: 1 });
    wait(HEAT_MS);
    expect(key.dataset.state).toBe("idle");
    expect(onTurboChange).not.toHaveBeenCalled();
  });

  it("holding for the heat-up turns turbo on, releasing turns it off", () => {
    const { key, onTurboChange } = setup();
    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });
    wait(HEAT_MS);
    expect(key.dataset.state).toBe("turbo");
    expect(key.getAttribute("aria-pressed")).toBe("true");
    expect(onTurboChange).toHaveBeenLastCalledWith(true);
    fireEvent.pointerUp(key, { pointerId: 1 });
    expect(key.dataset.state).toBe("idle");
    expect(onTurboChange).toHaveBeenLastCalledWith(false);
    expect(onTurboChange).toHaveBeenCalledTimes(2);
  });

  it("ended turns it into Replay; a click replays and goes back to idle", () => {
    const { key, onReplay, end } = setup();
    end();
    expect(key.dataset.state).toBe("turning");
    expect(key.getAttribute("aria-label")).toBe("Replay");
    wait(TURN_MS);
    expect(key.dataset.state).toBe("replay");
    fireEvent.pointerDown(key, { button: 0, pointerId: 1 }); // holding does nothing here
    expect(key.dataset.state).toBe("replay");
    fireEvent.click(key);
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(key.dataset.state).toBe("idle");
    expect(key.getAttribute("aria-label")).toBe("Hold to ship faster");
  });

  it("Space held behaves like the mouse", () => {
    const { key, onTurboChange } = setup();
    fireEvent.keyDown(key, { key: " " });
    wait(HEAT_MS);
    fireEvent.keyDown(key, { key: " ", repeat: true });
    expect(key.dataset.state).toBe("turbo");
    expect(onTurboChange).toHaveBeenLastCalledWith(true);
    fireEvent.keyUp(key, { key: " " });
    expect(onTurboChange).toHaveBeenLastCalledWith(false);
    expect(key.dataset.state).toBe("idle");
  });

  it("pointercancel and the window losing focus release the turbo", () => {
    const { key, onTurboChange } = setup();
    fireEvent.pointerDown(key, { button: 0, pointerId: 1 });
    wait(HEAT_MS);
    fireEvent.pointerCancel(key, { pointerId: 1 });
    expect(onTurboChange).toHaveBeenLastCalledWith(false);
    fireEvent.pointerDown(key, { button: 0, pointerId: 2 });
    wait(HEAT_MS);
    expect(onTurboChange).toHaveBeenLastCalledWith(true);
    act(() => void window.dispatchEvent(new Event("blur")));
    expect(onTurboChange).toHaveBeenLastCalledWith(false);
    expect(key.dataset.state).toBe("idle");
  });
});
