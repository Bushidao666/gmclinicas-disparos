"use client";
import { ReactNode } from "react";
import clsx from "clsx";

import { useSidebar } from "@/contexts/SidebarContext";

export function MainLayout({ children }: { children: ReactNode }) {
  const { isCollapsed } = useSidebar();

  return (
    <div className={clsx(
      "flex-1 flex flex-col transition-all duration-300",
      "lg:ml-64", // Default expanded sidebar width
      isCollapsed && "lg:ml-20" // Collapsed sidebar width
    )}>
      <main className="flex-grow overflow-auto pt-16 lg:pt-0">
        {children}
      </main>
      <footer className="w-full flex items-center justify-center py-3 border-t border-default-200">
        <span className="text-default-500 text-sm">GM Disparos © 2025</span>
      </footer>
    </div>
  );
}