import { describe, expect, it } from "vitest";
import { createSession, getPlayerList, setPlayerOffer } from "./store";

describe("session store metadata", () => {
  it("persists nickname on player offer", async () => {
    const { roomId } = await createSession();

    await setPlayerOffer(roomId, "player-1", "Alice", {
      type: "offer",
      sdp: "test-offer",
    });

    const players = await getPlayerList(roomId);

    expect(players).toHaveLength(1);
    expect(players[0].playerId).toBe("player-1");
    expect(players[0].nickname).toBe("Alice");
    expect(players[0].hasOffer).toBe(true);
  });
});
