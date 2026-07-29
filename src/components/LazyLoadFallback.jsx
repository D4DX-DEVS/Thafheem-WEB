import React from "react";
import { AppShellSkeleton } from "./LoadingSkeleton";

/**
 * Loading fallback component for lazy-loaded routes and components
 * Renders an app-shell skeleton with shimmer for smooth perceived loading
 */
const LazyLoadFallback = () => {
  return <AppShellSkeleton />;
};

/**
 * Compact loading fallback for smaller components
 */
export const CompactLoadFallback = ({ message = "Loading..." }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cyan-500 mx-auto mb-2"></div>
        <p className="text-gray-600 dark:text-gray-400 text-sm">
          {message}
        </p>
      </div>
    </div>
  );
};

export default LazyLoadFallback;


