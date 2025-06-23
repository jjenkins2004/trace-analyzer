import React from "react";
import { HashRouter, Routes, Route, Link } from "react-router-dom";
import Navbar from "./components/NavBar";
import Upload from "./screens/Upload";
import Compare from "./screens/Compare";
import Reports from "./screens/Reports";

const App: React.FC = () => (
  <div className="flex flex-col w-full h-full">
    <HashRouter>
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<Upload />} />
          <Route path="/compare" element={<Compare />} />
          <Route path="/reports" element={<Reports />} />
        </Routes>
      </div>
    </HashRouter>
  </div>
);

export default App;
