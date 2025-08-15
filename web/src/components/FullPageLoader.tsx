"use client";

import { Spinner } from "@heroui/spinner";

interface FullPageLoaderProps {
  message?: string;
}

export function FullPageLoader({ message = "Carregando..." }: FullPageLoaderProps) {
  return (
    <div className="min-h-screen grid place-items-center">
      <div className="flex flex-col items-center gap-4 text-default-600">
        <Spinner size="lg" />
        <p>{message}</p>
      </div>
    </div>
  );
}

