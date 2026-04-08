import React from 'react';
import { TreePine, Wheat, Leaf, Drumstick, Coins, ArrowRight, ArrowUpToLine, Pickaxe, SquareArrowDown } from 'lucide-react';
import { StoneIcon } from './StoneIcon';

interface Props {
  description: string;
  className?: string;
  large?: boolean;
}

export const IconicDescription: React.FC<Props> = ({ description, className = "", large = false }) => {
  // Regex to match [token], {small text}, (medium text), or other special characters or plain text
  // We split by tokens, keeping the tokens in the result
  const tokens = description.split(/(\[.*?\]|\{.*?\}|\(.*?\)|\+|\/|\||:|\n)/g).filter(token => token !== undefined);

  const iconBase = large ? "w-4 h-4" : "w-3.5 h-3.5";
  const furnishSize = large ? "w-[20px] h-[20px]" : "w-[17.5px] h-[17.5px]";
  const numberSize = large ? "w-[18.5px] h-[18.5px]" : "w-4 h-4";
  const textSize = "text-[14px]";

  const renderToken = (token: string, index: number) => {
    if (token === '\n') return <div key={index} className="w-full h-0" />;
    
    const trimmed = token.trim();
    if (!trimmed && token !== '\n') {
      // If it's just whitespace (but not a newline we already handled), render a small space
      if (token.length > 0) return <span key={index} className="mx-px" />;
      return null;
    }

    // Handle small text wrapped in {}
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      const content = trimmed.substring(1, trimmed.length - 1);
      // Smallest text for auxiliary info
      return <span key={index} className="text-[9px] text-stone-600 font-bold leading-none whitespace-nowrap">{content}</span>;
    }

    // Handle medium text wrapped in ()
    if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
      const content = trimmed.substring(1, trimmed.length - 1);
      // Medium text for labels/titles within the tile
      return <span key={index} className="text-[10px] text-stone-800 font-bold leading-none whitespace-nowrap">{content}</span>;
    }

    switch (trimmed) {
      case '+':
        return <span key={index} className="text-green-700 font-bold text-[14px] leading-none select-none -mr-px translate-y-[0.5px]">+</span>;
      case '/':
        return <span key={index} className="mx-0.5 text-stone-600 font-bold">/</span>;
      case ':':
        return <span key={index} className="mx-0.5 text-stone-600 font-bold">:</span>;
      case '[wood]':
        return <TreePine key={index} className={`${iconBase} text-amber-900 inline-block align-middle`} />;
      case '[stone]':
        return <StoneIcon key={index} className={`${iconBase} text-stone-600 inline-block align-middle`} />;
      case '[emmer]':
        return <Wheat key={index} className={`${iconBase} text-yellow-800 inline-block align-middle`} />;
      case '[flax]':
      case '[leaf]':
        return <Leaf key={index} className={`${iconBase} text-green-800 inline-block align-middle`} />;
      case '[flax-light]':
      case '[leaf-light]':
        return <Leaf key={index} className={`${iconBase} text-green-600 inline-block align-middle`} />;
      case '[flax-lighter]':
      case '[leaf-lighter]':
        return <Leaf key={index} className={`${iconBase} text-green-400 inline-block align-middle`} />;
      case '[food]':
        return <Drumstick key={index} className={`${iconBase} text-orange-800 inline-block align-middle`} />;
      case '[gold]':
        return <Coins key={index} className={`${iconBase} text-amber-600 inline-block align-middle`} />;
      case '[blue-room]':
        return <div key={index} className={`${iconBase} bg-blue-600 rounded-sm border border-blue-700 inline-block shadow-sm align-middle`} />;
      case '[furnish]':
        return <SquareArrowDown key={index} className={`${furnishSize} text-stone-700 inline-block shadow-sm align-middle`} />;
      case '|':
        return <span key={index} className="mx-1 text-stone-400 font-light align-middle">|</span>;
      case '[arrow-right]':
        return <ArrowRight key={index} className={`${iconBase} text-stone-600 inline-block mx-px align-middle`} />;
      case '[arrow-up-to-line]':
        return <ArrowUpToLine key={index} className={`${iconBase} text-blue-800 inline-block mx-px align-middle`} />;
      case '[pickaxe]':
        return <Pickaxe key={index} className={`${iconBase} text-stone-600 inline-block align-middle`} />;
      case '[space]':
        return <span key={index} className="w-2 inline-block align-middle" />;
      case '[1]':
        return (
          <span key={index} className={`inline-flex items-center justify-center ${numberSize} rounded-sm bg-orange-500 text-white text-[10px] font-bold shadow-sm border border-orange-600 mx-px whitespace-nowrap align-middle`}>
            1
          </span>
        );
      case '[2]':
        return (
          <span key={index} className={`inline-flex items-center justify-center ${numberSize} rounded-sm bg-orange-500 text-white text-[10px] font-bold shadow-sm border border-orange-600 mx-px whitespace-nowrap align-middle`}>
            2
          </span>
        );
      case '[3]':
        return (
          <span key={index} className={`inline-flex items-center justify-center ${numberSize} rounded-sm bg-orange-500 text-white text-[10px] font-bold shadow-sm border border-orange-600 mx-px whitespace-nowrap align-middle`}>
            3
          </span>
        );
      case '[4]':
        return (
          <span key={index} className={`inline-flex items-center justify-center ${numberSize} rounded-sm bg-orange-500 text-white text-[10px] font-bold shadow-sm border border-orange-600 mx-px whitespace-nowrap align-middle`}>
            4
          </span>
        );
      default:
        // Handle plain text or numbers - set a default size to avoid "too big" text
        return <span key={index} className={`${textSize} font-semibold text-stone-800 whitespace-nowrap leading-none align-middle`}>{token}</span>;
    }
  };

  const elements = [];
  let lastWasTrigger = false;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const trimmed = token.trim();
    
    if (!trimmed && token !== '\n') {
      elements.push(renderToken(token, i));
      continue;
    }

    if (trimmed === '+' && lastWasTrigger) {
      continue; // Skip the plus sign after a trigger
    }

    elements.push(renderToken(token, i));

    if (trimmed === '[arrow-right]' || trimmed === ':' || trimmed === '{:}' || trimmed === '{[arrow-right]}') {
      lastWasTrigger = true;
    } else if (trimmed !== '') {
      lastWasTrigger = false;
    }
  }

  return (
    <div className={`flex flex-wrap items-center gap-y-0.5 leading-none ${className}`}>
      {elements}
    </div>
  );
};
