import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach } from "vitest";
import React from "react";
import { useNewDesign } from "@/hooks/useNewDesign";
import NewDesignProvider from "@/components/v2/NewDesignProvider";

function wrapper({ children }: { children: React.ReactNode }) {
  return React.createElement(NewDesignProvider, null, children);
}

describe("useNewDesign", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("defaults to false when localStorage is empty", () => {
    const { result } = renderHook(() => useNewDesign(), { wrapper });
    expect(result.current.isNewDesign).toBe(false);
  });

  it("reads true from localStorage", () => {
    localStorage.setItem("gemsteps-new-ui", "true");
    const { result } = renderHook(() => useNewDesign(), { wrapper });
    expect(result.current.isNewDesign).toBe(true);
  });

  it("setNewDesign(true) updates both state and localStorage", () => {
    const { result } = renderHook(() => useNewDesign(), { wrapper });
    expect(result.current.isNewDesign).toBe(false);

    act(() => {
      result.current.setNewDesign(true);
    });

    expect(result.current.isNewDesign).toBe(true);
    expect(localStorage.getItem("gemsteps-new-ui")).toBe("true");
  });

  it("setNewDesign(false) removes from localStorage", () => {
    localStorage.setItem("gemsteps-new-ui", "true");
    const { result } = renderHook(() => useNewDesign(), { wrapper });

    act(() => {
      result.current.setNewDesign(false);
    });

    expect(result.current.isNewDesign).toBe(false);
    expect(localStorage.getItem("gemsteps-new-ui")).toBeNull();
  });
});
