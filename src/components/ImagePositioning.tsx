import React, { useState, useRef, useEffect } from 'react';
import { Move, RotateCw, ZoomIn, ZoomOut, X, Save } from 'lucide-react';

interface ImagePositioningProps {
  imageUrl: string;
  onSave: (positioning: ImagePositioning) => void;
  onClose: () => void;
  initialPositioning?: ImagePositioning;
}

export interface ImagePositioning {
  position: 'top' | 'bottom' | 'left' | 'right' | 'center';
  alignment: 'start' | 'center' | 'end';
  width: number;
  height: number;
  margin: number;
  textWrap: boolean;
}

export function ImagePositioning({ imageUrl, onSave, onClose, initialPositioning }: ImagePositioningProps) {
  const [positioning, setPositioning] = useState<ImagePositioning>(
    initialPositioning || {
      position: 'left',
      alignment: 'start',
      width: 300,
      height: 200,
      margin: 16,
      textWrap: true
    }
  );
  const containerRef = useRef<HTMLDivElement>(null);


  const handleSave = () => {
    onSave(positioning);
    onClose();
  };

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

  const getTextOrder = () => {
    if (positioning.position === 'top' || positioning.position === 'left') return 2;
    if (positioning.position === 'bottom' || positioning.position === 'right') return 1;
    return 2;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        <div className="p-4 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Позиционирование изображения</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4">
          {/* Controls */}
          <div className="mb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Позиция изображения
              </label>
              <select
                value={positioning.position}
                onChange={(e) => setPositioning(prev => ({ ...prev, position: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="left">Слева от текста</option>
                <option value="right">Справа от текста</option>
                <option value="top">Сверху от текста</option>
                <option value="bottom">Снизу от текста</option>
                <option value="center">По центру</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Выравнивание
              </label>
              <select
                value={positioning.alignment}
                onChange={(e) => setPositioning(prev => ({ ...prev, alignment: e.target.value as any }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="start">К началу</option>
                <option value="center">По центру</option>
                <option value="end">К концу</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Отступ (px)
              </label>
              <input
                type="range"
                min="0"
                max="50"
                value={positioning.margin}
                onChange={(e) => setPositioning(prev => ({ ...prev, margin: Number(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{positioning.margin}px</span>
            </div>
          </div>

          <div className="mb-4">
            <label className="flex items-center">
              <input
                type="checkbox"
                checked={positioning.textWrap}
                onChange={(e) => setPositioning(prev => ({ ...prev, textWrap: e.target.checked }))}
                className="mr-2"
              />
              <span className="text-sm text-gray-700">Обтекание текстом</span>
            </label>
          </div>

          {/* Preview Area */}
          <div 
            ref={containerRef}
            className="w-full h-96 bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg overflow-auto p-4"
            style={getLayoutStyle()}
          >
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
              className="border-2 border-indigo-500 rounded-lg overflow-hidden"
            >
              <img
                src={imageUrl}
                alt="Positioning preview"
                className="w-full h-full object-cover"
              />
            </div>
            
            {/* Text content */}
            <div
              style={{ order: getTextOrder() }}
              className="flex-1 min-w-0"
            >
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Заголовок темы</h3>
              <p className="text-gray-700 mb-4">
                Это пример текста, который будет отображаться рядом с изображением. 
                Вы можете видеть, как изображение взаимодействует с текстом в зависимости 
                от выбранной позиции и настроек обтекания.
              </p>
              <p className="text-gray-700 mb-4">
                Дополнительный абзац текста для демонстрации того, как контент 
                располагается относительно изображения. Текст может обтекать 
                изображение или располагаться в отдельных блоках.
              </p>
              <div className="flex gap-2">
                <button className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm">
                  Кнопка действия
                </button>
                <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm">
                  Другая кнопка
                </button>
              </div>
            </div>
          </div>

          {/* Size Controls */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ширина (px)
              </label>
              <input
                type="range"
                min="50"
                max="500"
                value={positioning.width}
                onChange={(e) => setPositioning(prev => ({ ...prev, width: Number(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{positioning.width}px</span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Высота (px)
              </label>
              <input
                type="range"
                min="50"
                max="500"
                value={positioning.height}
                onChange={(e) => setPositioning(prev => ({ ...prev, height: Number(e.target.value) }))}
                className="w-full"
              />
              <span className="text-xs text-gray-500">{positioning.height}px</span>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Отмена
          </button>
          <button
            onClick={handleSave}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
          >
            <Save className="w-4 h-4 mr-2" />
            Сохранить позицию
          </button>
        </div>
      </div>
    </div>
  );
}