import React, { useState } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import Navbar from "./components/Navbar";
import Upload from "./screens/Upload";
import Compare from "./screens/Compare";
import Reports from "./screens/Reports";

const App: React.FC = () => {
  const [file, setFile] = useState<File | null>(null);

  return (
    <div className="flex flex-col w-full h-full">
      <HashRouter>
        <Navbar />
        <div className="flex-1">
          <Routes>
            <Route
              path="/"
              element={<Upload file={file} setFile={setFile} />}
            />
            <Route path="/compare" element={<Compare />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </div>
      </HashRouter>
    </div>
  );
};

export default App;
