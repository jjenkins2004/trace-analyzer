import React from "react";
import { Link, useLocation } from "react-router-dom";

// Navigation items
const navItems = [
  { name: "Upload", to: "/" },
  { name: "Compare", to: "/compare" },
  { name: "Reports", to: "/reports" },
];

const Navbar: React.FC = () => {
  const location = useLocation();

  return (
    <nav className="w-full bg-gray-900 text-gray-200 shadow-md relative h-14 flex items-center">
      <div className="text-xl font-bold px-4 absolute hidden lg:block">
        <Link
          to="/"
          className="flex items-center space-x-2 hover:text-white transition-colors"
        >
          <span className="text-2xl font-bold">Trace Analyzer</span>
          <div className="flex space-x-1 items-center transform -rotate-45">
            <div className="bg-green-400 w-1 h-2 origin-bottom signal-pulse-1" />
            <div className="bg-green-400 w-1 h-4 origin-bottom signal-pulse-2" />
            <div className="bg-green-400 w-1 h-6 origin-bottom signal-pulse-3" />
          </div>
        </Link>
      </div>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="flex-1 flex justify-center">
          {navItems.map((item) => {
            const isActive = location.pathname === item.to;
            return (
              <Link
                key={item.name}
                to={item.to}
                className={
                  `mx-3 px-4 py-2 rounded-md font-medium transition-colors duration-200 flex items-center justify-center ` +
                  (isActive
                    ? "bg-indigo-600 text-white"
                    : "text-gray-400 hover:bg-gray-800 hover:text-white")
                }
              >
                {item.name}
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
