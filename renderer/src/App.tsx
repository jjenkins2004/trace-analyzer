import React, { useState } from 'react'
import reactLogo from './assets/react.svg'
import viteLogo from '/electron-vite.animate.svg'

const App = () => {
  const [count, setCount] = useState(0);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-6">
      <div className="flex space-x-6">
        <a href="https://electron-vite.github.io" target="_blank" rel="noopener noreferrer">
          <img src={viteLogo} className="h-16 w-16 hover:scale-110 transition-transform" alt="Vite logo" />
        </a>
        <a href="https://react.dev" target="_blank" rel="noopener noreferrer">
          <img src={reactLogo} className="h-16 w-16 hover:scale-110 transition-transform" alt="React logo" />
        </a>
      </div>

      <h1 className="text-4xl font-bold text-green-500">Vite + React + Tailwind</h1>

      <div className="bg-white shadow-md rounded-lg p-6">
        <button
          onClick={() => setCount((c) => c + 1)}
          className="px-4 py-2 bg-blue-500 text-white font-semibold rounded hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          count is {count}
        </button>
        <p className="mt-4 text-gray-600">
          Edit <code className="bg-gray-100 px-1 rounded">src/App.tsx</code> and save to test HMR
        </p>
      </div>

      <p className="text-gray-500">
        Click on the Vite and React logos to learn more
      </p>
    </div>
  );
}

export default App;

