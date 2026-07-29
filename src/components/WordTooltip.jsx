import { createPortal } from 'react-dom';
import { useMemo } from 'react';

const WordTooltip = ({ word, position, language, combinedArabic }) => {
  // Calculate position immediately using useMemo
  const tooltipPosition = useMemo(() => {
    if (!position) return { top: 0, left: 0, showAbove: false, arrowLeft: '50%' };

    const tooltipWidth = 250; // Match maxWidth CSS
    const viewportWidth = window.innerWidth;

    // position.x, position.y (top of word), position.yBottom (bottom of word)
    const wordTop = position.y;
    const wordBottom = position.yBottom ?? (position.y + 30);

    let left = position.x - tooltipWidth / 2;

    // Adjust if tooltip goes off screen horizontally
    if (left < 10) {
      left = 10;
    } else if (left + tooltipWidth > viewportWidth - 10) {
      left = viewportWidth - tooltipWidth - 10;
    }

    // Arrow points at the actual hovered word (corrected for clamped left)
    const arrowLeftPx = Math.max(16, Math.min(tooltipWidth - 16, position.x - left));
    const arrowLeft = `${arrowLeftPx}px`;

    // Default: show ABOVE the word.
    // We set `top` to wordTop - 4, then use CSS translateY(-100%) so the tooltip
    // BOTTOM lands exactly 4px above the word's top edge — no height estimation needed.
    let showAbove = true;
    let top = wordTop - 4;

    // Flip below when word is too close to the top of the viewport
    if (wordTop < 90) {
      showAbove = false;
      top = wordBottom + 4;
    }

    return { top, left, showAbove, arrowLeft };
  }, [position]);

  // Show tooltip if we have word, position, and translation
  if (!word || !word.translation?.text || !position) {
    return null;
  }

  // Get font class based on language
  const getFontClass = (lang) => {
    const langMap = {
      'malayalam': 'font-malayalam',
      'english': 'font-poppins',
      'hindi': 'font-hindi',
      'bangla': 'font-bengali',
      'urdu': 'font-urdu-nastaliq',
      'tamil': 'font-tamil'
    };
    return langMap[lang?.toLowerCase()] || 'font-poppins';
  };

  const meaning = word.translation?.text || '';
  const fontClass = getFontClass(language);



  return createPortal(
    <div
      className="fixed pointer-events-none"
      style={{
        top: `${tooltipPosition.top}px`,
        left: `${tooltipPosition.left}px`,
        maxWidth: '250px',
        minWidth: '150px',
        opacity: 1,
        visibility: 'visible',
        zIndex: 999999,
        // When showing above: translateY(-100%) moves the tooltip up by its own height,
        // so the bottom edge lands exactly at `top` (= wordTop - 4). No height estimation needed.
        transform: tooltipPosition.showAbove ? 'translateY(-100%) translateZ(0)' : 'translateZ(0)',
        willChange: 'transform',
        isolation: 'isolate',
      }}
      data-tooltip-visible="true"
    >
      <div className="bg-gray-900 dark:bg-gray-800 text-white dark:text-gray-100 rounded-lg px-4 py-3 shadow-2xl border border-gray-700 dark:border-gray-600 whitespace-normal">
        {/* Combined Arabic words when multiple words share the same meaning */}
        {combinedArabic && (
          <div
            className="text-sm text-gray-300 dark:text-gray-400 mb-1 text-right"
            dir="rtl"
            style={{ fontFamily: 'Amiri, "Scheherazade New", serif' }}
          >
            {combinedArabic}
          </div>
        )}
        {/* Meaning */}
        <div className={`text-sm leading-relaxed ${fontClass}`} dir="ltr">
          {meaning}
        </div>
        {/* Arrow - position based on whether tooltip is above or below */}
        {/* arrowLeft tracks the hovered word so the arrow points correctly even when the tooltip is clamped */}
        {tooltipPosition.showAbove ? (
          // Arrow pointing down (tooltip is above word)
          <div className="absolute top-full -mt-px" style={{ left: tooltipPosition.arrowLeft, transform: 'translateX(-50%)' }}>
            <div className="w-0 h-0 border-l-8 border-r-8 border-t-8 border-transparent border-t-gray-900 dark:border-t-gray-800"></div>
          </div>
        ) : (
          // Arrow pointing up (tooltip is below word)
          <div className="absolute bottom-full -mb-px" style={{ left: tooltipPosition.arrowLeft, transform: 'translateX(-50%)' }}>
            <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900 dark:border-b-gray-800"></div>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};

export default WordTooltip;
