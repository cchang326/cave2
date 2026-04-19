import React from 'react';
import { ChecklistItem, Good } from '../types/game';
import { IconicDescription } from './IconicDescription';

interface Props {
  item: ChecklistItem;
  className?: string;
  large?: boolean;
}

export const getIconicString = (item: ChecklistItem, amount?: number): string => {
  const { actionType, data } = item;
  let parts: string[] = [];

  const displayAmt = amount !== undefined ? amount : (data?.finalAmount !== undefined ? data.finalAmount : 1);
  const amtValue = displayAmt;

  // Handle payBefore/condition prefixes
  if (data?.payBefore) {
    const costs = Object.entries(data.payBefore)
      .map(([good, amt]) => `${amt}[${good}]`)
      .join(' ');
    parts.push(`${costs} [arrow-right]`);
  }

  if (data?.condition) {
    if (data.condition.maxStone !== undefined) {
      parts.push(`{if < ${data.condition.maxStone + 1} stones}`);
    }
    if (data.condition.minGold !== undefined) {
      parts.push(`${data.condition.minGold}[gold]:`);
    }
  }

  switch (actionType) {
    case 'GAIN':
      if (data?.replenishUpTo) {
        const goods = Object.entries(data.replenishUpTo)
          .map(([good, amt]) => `[arrow-up-to-line]${amt}[${good}]`)
          .join(' ');
        parts.push(goods);
      } else if (data?.goods) {
        // Only prefix with + if there's no preceding action/cost/condition
        const prefix = parts.length === 0 ? '+' : '';
        const goods = Object.entries(data.goods)
          .map(([good, amt]) => `${prefix}${amt}[${good}]`)
          .join(' ');
        parts.push(goods);
      }
      break;

    case 'PAY':
      if (data?.goods) {
        const goods = Object.entries(data.goods)
          .map(([good, amt]) => `${amt}[${good}]`)
          .join(' ');
        parts.push(goods);
      }
      break;

    case 'EXCAVATE':
      const pickaxes = Array(data?.count || 1).fill('[pickaxe]').join(' ');
      parts.push(pickaxes);
      if (data?.ignoreWalls) parts.push('[space] even through walls');
      break;

    case 'FURNISH':
      const furnishings = Array(data?.count || 1).fill('[furnish]').join(' ');
      parts.push(furnishings);
      break;

    case 'ROOM_ACTION':
      parts.push(`[${data?.count || 1}]`);
      break;

    case 'BUILD_WALL':
      parts.push('Build a wall');
      break;

    case 'REMOVE_WALL':
      parts.push('Remove a wall');
      break;

    case 'PAY_DYNAMIC':
      parts.push(`${data?.amount} {diff goods} [arrow-right]`);
      break;

    case 'QUANTITY':
      if (data?.costPer && data?.gainPer) {
        const costs = Object.entries(data.costPer)
          .map(([good, amt]) => `${(amt as number) * amtValue}[${good}]`)
          .join(' ');
        const gains = Object.entries(data.gainPer)
          .map(([good, amt]) => `${(amt as number) * amtValue}[${good}]`)
          .join(' ');
        parts.push(`${costs} [arrow-right] ${gains}`);
      }
      break;

    default:
      return item.text;
  }

  // Handle gainAfter suffix (bonuses/passive triggers)
  if (data?.gainAfter) {
    const gains = Object.entries(data.gainAfter)
      .map(([good, amt]) => `${amt}[${good}]`)
      .join(' ');
    // Use : for passive/bonus effects as requested
    parts.push(`: ${gains}`);
  }

  return parts.join(' ');
};

export const getIconicChoiceLabel = (option: any): string => {
  if (option.items && option.items.length > 0) {
    // Use the iconic strings of the items directly as they usually include the costs
    return option.items.map((item: ChecklistItem) => getIconicString(item)).join(' ');
  }

  let parts: string[] = [];
  
  if (option.cost && Object.keys(option.cost).length > 0) {
    const costs = Object.entries(option.cost)
      .map(([good, amt]) => `${amt}[${good}]`)
      .join(' ');
    parts.push(`${costs} [arrow-right]`);
  }

  parts.push(option.label);
  return parts.join(' ');
};

export const ChecklistIconRenderer: React.FC<Props & { amount?: number }> = ({ item, className = "", large = false, amount }) => {
  return (
    <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${className}`}>
      <IconicDescription description={getIconicString(item, amount)} large={large} />
      {item.passiveGains?.map((pg, idx) => (
        <div 
          key={idx}
          title={`${pg.name} effect`}
          className="bg-blue-100/90 border border-blue-300 px-1.5 py-0.5 rounded shadow-sm flex items-center gap-1 animate-in fade-in zoom-in-95 duration-300"
        >
          <IconicDescription 
            description={Object.entries(pg.goods).map(([good, amt]) => `+${amt}[${good}]`).join(' ')} 
            large={large} 
          />
        </div>
      ))}
    </div>
  );
};
