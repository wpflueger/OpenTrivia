import Link from "next/link";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8 relative z-10">
      <div className="text-center">
        <h1 className="text-6xl font-bold cyber-glow-text mb-4">OpenTrivia</h1>
        <p className="text-xl text-cyber-white-dim max-w-md mx-auto">
          Open source P2P trivia game. Host a game and play with friends - no
          account needed.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/host"
          className="cyber-button px-8 py-4 text-lg rounded-xl"
        >
          Host a Game
        </Link>
        <Link
          href="/join"
          className="cyber-button-secondary px-8 py-4 text-lg rounded-xl"
        >
          Join a Game
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="cyber-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-cyber-white mb-2">
            No Accounts
          </h3>
          <p className="text-cyber-white-dim">
            Just open the link and start playing. No sign-up required.
          </p>
        </div>
        <div className="cyber-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-cyber-white mb-2">
            P2P Powered
          </h3>
          <p className="text-cyber-white-dim">
            Direct peer-to-peer connections. Fast and reliable gameplay.
          </p>
        </div>
        <div className="cyber-card p-6 rounded-xl">
          <h3 className="text-lg font-semibold text-cyber-white mb-2">
            Custom Packs
          </h3>
          <p className="text-cyber-white-dim">
            Load trivia packs from any GitHub repository.
          </p>
        </div>
      </div>
    </div>
  );
}
