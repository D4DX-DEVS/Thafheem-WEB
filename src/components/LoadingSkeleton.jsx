/**
 * Loading Skeleton Components with Shimmer Effect
 * Provides smooth, performant visual feedback while content is loading
 * ✨ Enhanced with gradient shimmer animation for better perceived performance
 */

import React from 'react';

// Shimmer wrapper component
const Shimmer = ({ className = "", children }) => (
  <div className={`relative overflow-hidden ${className}`}>
    {children}
    <div className="absolute inset-0 -translate-x-full animate-[shimmer_2s_infinite] bg-gradient-to-r from-transparent via-white/60 dark:via-white/10 to-transparent"></div>
  </div>
);

// Verse skeleton for Surah.jsx
export const VerseSkeleton = () => (
  <div className="pb-4 sm:pb-6 border-b border-gray-200 dark:border-gray-700 rounded-md">
    {/* Arabic text skeleton */}
    <div className="text-right mb-2 sm:mb-3 lg:mb-4">
      <Shimmer className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded mb-2" />
      <Shimmer className="h-6 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-3/4 ml-auto" />
    </div>
    
    {/* Translation skeleton */}
    <div className="mb-2 sm:mb-3">
      <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded mb-2" />
      <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded mb-2 w-5/6" />
      <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-3/4" />
    </div>
    
    {/* Actions skeleton */}
    <div className="flex flex-wrap items-center gap-2 sm:gap-4 lg:gap-6">
      {Array.from({ length: 7 }).map((_, i) => (
        <Shimmer key={i} className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-8" />
      ))}
    </div>
  </div>
);

// Block skeleton for BlockWise.jsx - Optimized for speed
export const BlockSkeleton = () => (
  <div className="rounded-xl mb-4 sm:mb-6 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
    <div className="px-3 sm:px-4 pt-3 sm:pt-4 flex items-center justify-between">
      <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-32" />
    </div>

    <div className="p-3 sm:p-4 md:p-6 lg:p-8">
      {/* Arabic text skeleton - Prominent shimmer */}
      <div className="text-center mb-4 space-y-2">
        <Shimmer className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded" />
        <Shimmer className="h-10 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded" />
        <Shimmer className="h-8 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-3/4 mx-auto" />
      </div>
    </div>

    <div className="px-3 sm:px-4 md:px-6 lg:px-8 pb-3 sm:pb-4 md:pb-6 lg:pb-8">
      {/* Translation skeleton */}
      <div className="mb-4 space-y-2">
        <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded" />
        <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded" />
        <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-5/6" />
        <Shimmer className="h-4 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded w-3/4" />
      </div>
      
      {/* Action buttons skeleton */}
      <div className="flex flex-wrap justify-start gap-1 sm:gap-2">
        {Array.from({ length: 6 }).map((_, i) => (
          <Shimmer key={i} className="h-10 w-10 bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded-lg" />
        ))}
      </div>
    </div>
  </div>
);

// Loading indicator with progress - Enhanced spinner
export const LoadingWithProgress = ({ progress = 0, message = "Loading..." }) => (
  <div className="min-h-screen bg-white dark:bg-gray-900 flex items-center justify-center">
    <div className="text-center max-w-md mx-auto px-4">
      {/* Enhanced spinner with gradient */}
      <div className="relative mx-auto mb-4 h-16 w-16">
        <div className="absolute inset-0 rounded-full border-4 border-gray-200 dark:border-gray-700"></div>
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-cyan-500 border-r-cyan-400 animate-spin"></div>
      </div>
      <p className="text-gray-600 dark:text-gray-400 mb-4 font-medium">{message}</p>
      
      {/* Progress bar with shimmer */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 mb-2 overflow-hidden relative">
        <div 
          className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-2 rounded-full transition-all duration-300 ease-out relative overflow-hidden"
          style={{ width: `${progress}%` }}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent animate-[shimmer_2s_infinite]"></div>
        </div>
      </div>
      
      <p className="text-sm text-gray-500 dark:text-gray-400">{progress}% complete</p>
    </div>
  </div>
);

// Compact loading indicator - Enhanced with smooth animation
export const CompactLoading = ({ message = "Loading..." }) => (
  <div className="flex items-center space-x-2 text-gray-500 dark:text-gray-400 text-sm">
    <div className="relative h-4 w-4">
      <div className="absolute inset-0 rounded-full border border-gray-300 dark:border-gray-600"></div>
      <div className="absolute inset-0 rounded-full border border-transparent border-t-cyan-500 animate-spin"></div>
    </div>
    <span>{message}</span>
  </div>
);

// Skeleton for multiple verses
export const VersesSkeleton = ({ count = 5 }) => (
  <div className="space-y-4 sm:space-y-6 lg:space-y-8">
    {Array.from({ length: count }).map((_, index) => (
      <VerseSkeleton key={index} />
    ))}
  </div>
);

// Skeleton for multiple blocks
export const BlocksSkeleton = ({ count = 3 }) => (
  <div className="space-y-4 sm:space-y-6">
    {Array.from({ length: count }).map((_, index) => (
      <BlockSkeleton key={index} />
    ))}
  </div>
);

// Shared shimmer bar shorthand
const Bar = ({ className = "" }) => (
  <Shimmer className={`bg-gradient-to-r from-gray-200 to-gray-300 dark:from-gray-700 dark:to-gray-600 rounded ${className}`} />
);

// Compact list rows for sidebar/navigation panels (surah list, juz list, verse list)
export const SidebarListSkeleton = ({ count = 8 }) => (
  <div className="space-y-2 py-2">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="flex items-center gap-3 px-2 py-2">
        <Bar className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Bar className="h-3.5 w-2/3" />
          <Bar className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

// Grid of cards (Juz grid, surah grid)
export const CardGridSkeleton = ({ count = 12 }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4 py-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800">
        <div className="flex items-center gap-3 mb-3">
          <Bar className="h-10 w-10 rounded-full shrink-0" />
          <div className="flex-1 space-y-2">
            <Bar className="h-4 w-3/4" />
            <Bar className="h-3 w-1/2" />
          </div>
        </div>
        <Bar className="h-3 w-full" />
      </div>
    ))}
  </div>
);

// Stacked bookmark/favorite cards
export const CardListSkeleton = ({ count = 6 }) => (
  <div className="space-y-3 py-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 flex items-center gap-4">
        <Bar className="h-12 w-12 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Bar className="h-4 w-1/2" />
          <Bar className="h-3 w-3/4" />
        </div>
        <Bar className="h-8 w-8 rounded-lg shrink-0" />
      </div>
    ))}
  </div>
);

// Text-heavy content page (SurahInfo, notes, articles)
export const ContentSkeleton = ({ lines = 10 }) => (
  <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
    <div className="space-y-3">
      <Bar className="h-7 w-1/2" />
      <Bar className="h-4 w-1/3" />
    </div>
    <div className="space-y-3">
      {Array.from({ length: lines }).map((_, i) => (
        <Bar key={i} className={`h-4 ${i % 4 === 3 ? "w-2/3" : "w-full"}`} />
      ))}
    </div>
  </div>
);

// Word-by-word grid (word cards with Arabic + meaning)
export const WordGridSkeleton = ({ count = 12 }) => (
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 p-4">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-gray-800 space-y-2">
        <Bar className="h-6 w-full" />
        <Bar className="h-3 w-3/4 mx-auto" />
      </div>
    ))}
  </div>
);

// Quiz question + options
export const QuizSkeleton = () => (
  <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
    <div className="flex items-center justify-between">
      <Bar className="h-4 w-24" />
      <Bar className="h-4 w-16" />
    </div>
    <div className="space-y-2">
      <Bar className="h-6 w-full" />
      <Bar className="h-6 w-4/5" />
    </div>
    <div className="space-y-3 pt-2">
      {Array.from({ length: 4 }).map((_, i) => (
        <Bar key={i} className="h-12 w-full rounded-lg" />
      ))}
    </div>
  </div>
);

// Accordion rows (Tajweed rules, expandable lists)
export const AccordionSkeleton = ({ count = 8 }) => (
  <div className="max-w-3xl mx-auto px-4 py-6 space-y-3">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="border border-gray-200 dark:border-gray-700 rounded-xl p-4 bg-white dark:bg-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-3 flex-1">
          <Bar className="h-8 w-8 rounded-full shrink-0" />
          <Bar className="h-4 w-1/2" />
        </div>
        <Bar className="h-5 w-5 rounded shrink-0" />
      </div>
    ))}
  </div>
);

// Full app-shell skeleton: navbar bar + card grid (initial app load, lazy routes)
export const AppShellSkeleton = () => (
  <div className="min-h-screen bg-white dark:bg-gray-900">
    <div className="border-b border-gray-200 dark:border-gray-700 px-4 py-3 flex items-center justify-between">
      <Bar className="h-8 w-32" />
      <div className="flex items-center gap-3">
        <Bar className="h-8 w-8 rounded-full" />
        <Bar className="h-8 w-8 rounded-full" />
        <Bar className="h-8 w-20 rounded-lg" />
      </div>
    </div>
    <div className="max-w-[1290px] mx-auto px-4">
      <div className="py-6 flex justify-center">
        <Bar className="h-10 w-full max-w-xl rounded-full" />
      </div>
      <CardGridSkeleton count={12} />
    </div>
  </div>
);

export default {
  VerseSkeleton,
  BlockSkeleton,
  LoadingWithProgress,
  CompactLoading,
  VersesSkeleton,
  BlocksSkeleton,
  SidebarListSkeleton,
  CardGridSkeleton,
  CardListSkeleton,
  ContentSkeleton,
  WordGridSkeleton,
  QuizSkeleton,
  AccordionSkeleton,
  AppShellSkeleton
};
