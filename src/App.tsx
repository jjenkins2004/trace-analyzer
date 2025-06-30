import React from "react";
import { HashRouter, useLocation } from "react-router-dom";
import Navbar from "./components/Navbar";
import Upload from "./screens/Upload";
import Compare from "./screens/Compare";
import Reports from "./screens/Reports";

const PersistedApp: React.FC = () => {
  const location = useLocation();

  return (
    <div className="flex flex-col w-full h-full">
      <Navbar />

      <div className="flex-1 relative">
        <div className={location.pathname === "/" ? "block" : "hidden"}>
          <Upload />
        </div>
        <div className={location.pathname === "/compare" ? "block" : "hidden"}>
          <Compare />
        </div>
        <div className={location.pathname === "/reports" ? "block" : "hidden"}>
          <Reports />
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => (
  <HashRouter>
    <PersistedApp />
  </HashRouter>
);

export default App;
