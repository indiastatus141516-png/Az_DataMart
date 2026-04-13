import React, { useContext } from "react";
import { Outlet } from "react-router-dom";
import { AuthContext } from "../context/AuthContext";

const DashboardShell = () => {
  const { logout, isAdmin } = useContext(AuthContext);
  const isAdminView = isAdmin();

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="flex min-h-screen flex-col">
        <header className="crm-topbar">
          <div className="mx-auto flex w-full max-w-6xl flex-wrap items-center justify-between gap-4">
            <div>
              <p className="crm-label">
                {isAdminView ? "Admin Overview" : "User Overview"}
              </p>
              <h2 className="text-lg font-semibold text-text-primary sm:text-xl">
                Keep your operations on a single page.
              </h2>
            </div>
            <div className="flex items-center gap-3">
              <button className="crm-btn crm-btn-outline crm-btn-sharp">
                Export
              </button>
              <button
                onClick={logout}
                className="crm-btn crm-btn-primary crm-btn-sharp"
              >
                Log out
              </button>
            </div>
          </div>
        </header>

        <main className="flex-1 bg-bg-primary px-4 py-6 text-text-primary sm:px-6">
          <div className="mx-auto w-full max-w-6xl">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardShell;
