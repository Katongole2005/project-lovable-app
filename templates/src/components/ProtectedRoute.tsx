"use client";
import { Navigate } from "@/lib/router-polyfill";
import { useAuth } from "@/hooks/useAuth";

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  return <>{children}</>;
};

export default ProtectedRoute;
