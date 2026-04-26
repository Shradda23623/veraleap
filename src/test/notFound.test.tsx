import { describe, it, expect, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import NotFound from "@/pages/NotFound";

describe("NotFound page", () => {
  afterEach(() => cleanup());

  it("renders the 404 heading", () => {
    render(
      <MemoryRouter initialEntries={["/this-route-does-not-exist"]}>
        <NotFound />
      </MemoryRouter>,
    );
    expect(screen.getByRole("heading", { name: /404/ })).toBeInTheDocument();
  });

  it("renders a link back to the home page", () => {
    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <NotFound />
      </MemoryRouter>,
    );
    const link = screen.getByRole("link", { name: /return to home/i });
    expect(link).toHaveAttribute("href", "/");
  });

  it("sets a sensible page title via useSEO", () => {
    render(
      <MemoryRouter initialEntries={["/missing"]}>
        <NotFound />
      </MemoryRouter>,
    );
    expect(document.title).toContain("Page not found");
    expect(document.title).toContain("VeraLeap");
  });
});
