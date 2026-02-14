import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import JoinPage from "../join/page";

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("Join Page", () => {
  it("should render the join page title", () => {
    render(<JoinPage />);
    expect(screen.getByText("Join a Game")).toBeInTheDocument();
  });

  it("should render room code input", () => {
    render(<JoinPage />);
    expect(screen.getByLabelText("Room Code")).toBeInTheDocument();
  });

  it("should render nickname input", () => {
    render(<JoinPage />);
    expect(screen.getByLabelText("Your Nickname")).toBeInTheDocument();
  });

  it("should render Join Game button", () => {
    render(<JoinPage />);
    expect(
      screen.getByRole("button", { name: /join game/i }),
    ).toBeInTheDocument();
  });
});
