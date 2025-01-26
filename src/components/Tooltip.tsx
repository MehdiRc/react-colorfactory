import React, { useEffect, useState } from 'react';

interface TooltipProps {
  text: string;
  visible: boolean;
  x: number;
  y: number;
}

const Tooltip: React.FC<TooltipProps> = ({ text, visible, x, y }) => {
  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: x + 10,
        top: y + 10,
        padding: '4px 8px',
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        color: 'white',
        fontSize: '12px',
        borderRadius: '4px',
        pointerEvents: 'none',
        zIndex: 9999,
        whiteSpace: 'nowrap',
      }}
    >
      {text}
    </div>
  );
};

export default Tooltip; 