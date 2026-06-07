import React, { useState } from 'react';

export default function Tooltip({ text, children, position = 'top' }) {
  const [show, setShow] = useState(false);
  if (!text) return children;

  const pos = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position] || 'bottom-full left-1/2 -translate-x-1/2 mb-2';

  return (
    <div className="relative inline-flex" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className={`absolute ${pos} z-50 pointer-events-none`}>
          <div className="bg-gray-900 dark:bg-gray-700 text-white text-xs px-2.5 py-1.5 rounded-lg whitespace-nowrap shadow-xl max-w-48 text-center">
            {text}
          </div>
        </div>
      )}
    </div>
  );
}
