import React from 'react';
import { WallRequirement } from '../types/game';

interface Props {
  req?: WallRequirement;
  className?: string;
}

export const WallRequirementIcon: React.FC<Props> = ({ req, className = '' }) => {
  if (!req) return null;

  let top = 0, right = 0, bottom = 0, left = 0;
  
  if (req.configuration === 'opposing') {
    top = 2;
    bottom = 2;
  } else {
    const walls = [0, 0, 0, 0];
    for (let i = 0; i < req.max; i++) {
      walls[i] = i < req.min ? 2 : 1;
    }
    [top, right, bottom, left] = walls;
  }

  const getBorderColor = (state: number) => {
    if (state === 2) return '#1c1917'; // stone-800
    if (state === 1) return '#a8a29e'; // stone-400
    return 'transparent';
  };

  const title = `Requires ${req.min === req.max ? req.min : `${req.min}-${req.max}`} ${req.configuration !== 'any' ? req.configuration + ' ' : ''}wall(s)`;

  return (
    <div 
      className={`bg-white/50 rounded-sm flex items-center justify-center shrink-0 ${className || 'w-6 h-6'}`}
      title={title}
    >
      <div 
        className="w-3 h-3 box-content translate-y-[-0.5px]"
        style={{
          borderTop: `2px solid ${getBorderColor(top)}`,
          borderRight: `2px solid ${getBorderColor(right)}`,
          borderBottom: `2px solid ${getBorderColor(bottom)}`,
          borderLeft: `2px solid ${getBorderColor(left)}`,
        }}
      />
    </div>
  );
};
