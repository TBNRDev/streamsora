import { CloudArrowUpIcon, HomeIcon } from "@heroicons/react/24/outline";
import React, { useState } from "react";

const Navigation = [
  {
    name: "Dashboard",
    page: 1,
    icon: <HomeIcon />,
    current: false,
  },
  {
    name: "Metadata",
    page: 2,
    icon: <CloudArrowUpIcon />,
    current: false,
  },
];

export default function AdminLayout({ children, page, setPage }) {
  const [navbarOpen, setNavbarOpen] = useState(true);

  const toggleNavbar = () => {
    setNavbarOpen(!navbarOpen);
  };

  return (
      <div className="relative w-screen h-screen">
        <nav className="bg-secondary w-full h-20 flex items-center justify-between px-5">
          <div className="flex items-center">
            <h1 className="text-2xl font-bold text-white ml-4">Admin Dashboard</h1>
          </div>
          <button
              onClick={toggleNavbar}
              className="text-white bg-gray-600 p-2 rounded-md lg:hidden"
          >
            {navbarOpen ? "Close" : "Open"}
          </button>
          <div className={`lg:flex lg:flex-col gap-5 ${navbarOpen ? "" : "hidden lg:block"}`}>
            <div className="flex items-center gap-2 lg:gap-5">
              {Navigation.map((item, index) => (
                  <button
                      key={item.name}
                      onClick={() => setPage(item.page)}
                      className={`p-2 group ${
                          page === item.page ? "bg-image/50" : "text-txt"
                      } hover:bg-image rounded transition-colors duration-200 ease-in-out`}
                  >
                    <div
                        className={`w-5 h-5 ${
                            page === item.page ? "text-action" : "text-txt"
                        } group-hover:text-action`}
                    >
                      {item.icon}
                    </div>
                    <p>{item.name}</p>
                  </button>
              ))}
            </div>
          </div>
        </nav>
        <div className="overflow-x-hidden h-full flex-1">
          {children}
        </div>
      </div>
  );
}
