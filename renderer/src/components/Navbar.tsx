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
    <nav className="w-full bg-gray-900 text-gray-200 shadow-md">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo or Brand placeholder */}
          <div className="text-xl font-semibold">
            <Link to="/" className="hover:text-white">
              Wifi Doctor
            </Link>
          </div>
          {/* Nav links */}
          <div className="flex space-x-8">
            {navItems.map((item) => {
              const isActive = location.pathname === item.to;
              return (
                <Link
                  key={item.name}
                  to={item.to}
                  className={`relative px-3 py-2 font-medium transition-all $
                    isActive ? 'text-white' : 'text-gray-400 hover:text-white'
                  `}
                >
                  {item.name}
                  <span
                    className={`absolute bottom-0 left-0 w-full h-0.5 bg-indigo-500 transform $
                      isActive ? 'scale-x-100' : 'scale-x-0'
                    transition-transform`}
                  />
                </Link>
              );
            })}
          </div>
          {/* Optional dark mode toggle placeholder */}
          <div>{/* Insert your theme toggle component here */}</div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
