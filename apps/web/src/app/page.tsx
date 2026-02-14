import Link from 'next/link';

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-8">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary-700 mb-4">OpenTrivia</h1>
        <p className="text-xl text-gray-600 max-w-md mx-auto">
          Open source P2P trivia game. Host a game and play with friends - no account needed.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <Link
          href="/host"
          className="px-8 py-4 bg-primary-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-primary-700 transition-colors"
        >
          Host a Game
        </Link>
        <Link
          href="/join"
          className="px-8 py-4 bg-white text-primary-700 text-lg font-semibold rounded-xl shadow-lg border-2 border-primary-200 hover:border-primary-300 transition-colors"
        >
          Join a Game
        </Link>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl">
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">No Accounts</h3>
          <p className="text-gray-600">Just open the link and start playing. No sign-up required.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">P2P Powered</h3>
          <p className="text-gray-600">Direct peer-to-peer connections. Fast and reliable gameplay.</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-md">
          <h3 className="text-lg font-semibold text-gray-800 mb-2">Custom Packs</h3>
          <p className="text-gray-600">Load trivia packs from any GitHub repository.</p>
        </div>
      </div>
    </div>
  );
}
