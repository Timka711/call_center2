import React from 'react';
import { ImagePositioning } from './ImagePositioning';

interface PositionedImageProps {
  imageUrl: string;
  positioning?: ImagePositioning;
  className?: string;
  containerClassName?: string;
  children?: React.ReactNode;
}

export function PositionedImage({ 
  imageUrl, 
  positioning, 
  className = '',
  containerClassName = '',
  children
}: PositionedImageProps) {
  if (!positioning) {
    return (
      <div className={`flex flex-col ${containerClassName}`}>
        <div className="w-full h-48 overflow-hidden rounded-lg mb-4">
          <img 
            src={imageUrl} 
            alt=""
            className={`w-full h-full object-cover ${className}`}
          />
        </div>
        {children}
      </div>
    );
  }

  const getLayoutStyle = () => {
    const isVertical = positioning.position === 'top' || positioning.position === 'bottom';
    const isHorizontal = positioning.position === 'left' || positioning.position === 'right';
    
    if (positioning.position === 'center') {
      return {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: 'center',
        gap: `${positioning.margin}px`
      };
    }
    
    if (isVertical) {
      return {
        display: 'flex',
        flexDirection: 'column' as const,
        alignItems: positioning.alignment === 'start' ? 'flex-start' : 
                   positioning.alignment === 'end' ? 'flex-end' : 'center',
        gap: `${positioning.margin}px`
      };
    }
    
    if (isHorizontal) {
      return {
        display: 'flex',
        flexDirection: 'row' as const,
        alignItems: positioning.alignment === 'start' ? 'flex-start' : 
                   positioning.alignment === 'end' ? 'flex-end' : 'center',
        gap: `${positioning.margin}px`
      };
    }
  };

  const getImageOrder = () => {
    if (positioning.position === 'top' || positioning.position === 'left') return 1;
    if (positioning.position === 'bottom' || positioning.position === 'right') return 2;
    return 1;
  };

  const getContentOrder = () => {
    if (positioning.position === 'top' || positioning.position === 'left') return 2;
    if (positioning.position === 'bottom' || positioning.position === 'right') return 1;
    return 2;
  };

  return (
    <div className={containerClassName} style={getLayoutStyle()}>
      {/* Image */}
      <div
        style={{
          order: getImageOrder(),
          width: `${positioning.width}px`,
          height: `${positioning.height}px`,
          flexShrink: 0,
          float: positioning.textWrap && (positioning.position === 'left' || positioning.position === 'right') 
            ? positioning.position as any : 'none'
        }}
        className="overflow-hidden rounded-lg"
      >
        <img
          src={imageUrl}
          alt=""
          className={`w-full h-full object-cover ${className}`}
        />
      </div>
      
      {/* Content */}
      {children && (
        <div 
          style={{ order: getContentOrder() }}
          className="flex-1 min-w-0"
        >
          {children}
        </div>
      )}
    </div>
  );
}