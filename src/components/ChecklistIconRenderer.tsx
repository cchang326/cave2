import React from 'react';
import { ChecklistItem, Good } from '../types/game';
import { IconicDescription } from './IconicDescription';

interface Props {
  item: ChecklistItem;
  className?: string;
  large?: boolean;
}

export const getIconicString = (item: ChecklistItem): string => {
  const { actionType, data } = item;
  let parts: string[] = [];

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
        const goods = Object.entries(data.goods)
          .map(([good, amt]) => `+${amt}[${good}]`)
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

    default:
      return item.text;
  }

  // Handle gainAfter suffix
  if (data?.gainAfter) {
    const gains = Object.entries(data.gainAfter)
      .map(([good, amt]) => `+${amt}[${good}]`)
      .join(' ');
    parts.push(`[arrow-right] ${gains}`);
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

export const ChecklistIconRenderer: React.FC<Props> = ({ item, className = "", large = false }) => {
  return <IconicDescription description={getIconicString(item)} className={className} large={large} />;
};
