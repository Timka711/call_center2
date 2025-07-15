import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Move, RotateCw, ZoomIn, ZoomOut, Plus, Save, Grid, Eye, X, Edit, Trash, Image as ImageIcon, Settings, FormInput, ArrowRight } from 'lucide-react';
import { QuestionForm } from './QuestionForm';
import { FormSettings } from './FormSettings';
import { ImageUpload } from './ImageUpload';
import { ImagePositioning, ImagePositioning as ImagePositioningType } from './ImagePositioning';

// ... (интерфейсы остаются без изменений)

export function MiroBoard({ parentId, questions, onUpdateQuestions, onNavigateToSubboard }: MiroBoardProps) {
  // ... (состояния остаются без изменений)

  useEffect(() => {
    const parent = questions.find(q => q.id === parentId);
    setParentQuestion(parent ? {
      ...parent,
      board_position: parent.board_position || {
        x: 100,
        y: 50,
        width: 400,
        height: 300
      }
    } : null);

    const subtopics = questions.filter(q => q.parent_id === parentId);
    const questionsWithPositions = subtopics.map(q => ({
      ...q,
      board_position: q.board_position || {
        x: Math.random() * 600 + 200,
        y: Math.random() * 400 + 300,
        width: 320,
        height: 240
      }
    }));
    setBoardQuestions(questionsWithPositions);
  }, [questions, parentId]);

  // ... (остальные функции)

  return (
    <div 
      ref={boardRef}
      className="relative w-full h-full overflow-hidden bg-gray-100"
      // ... (обработчики событий)
    >
      {/* ... (контролы и другие элементы) */}

      {/* Родительский вопрос */}
      {parentQuestion && (
        <div
          className="absolute bg-blue-50 rounded-lg shadow-lg border-2 border-blue-200"
          style={{
            left: parentQuestion.board_position?.x || 0,
            top: parentQuestion.board_position?.y || 0,
            width: parentQuestion.board_position?.width || 400,
            height: parentQuestion.board_position?.height || 300,
            transform: `scale(${1 / zoom})`,
            transformOrigin: '0 0'
          }}
        >
          <div className="p-4">
            <h3 className="font-bold text-blue-800">{parentQuestion.content}</h3>
          </div>
        </div>
      )}

      {/* Подтемы */}
      <div 
        className="absolute inset-0"
        style={{
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`
        }}
      >
        {boardQuestions.map((question) => (
          <div
            key={question.id}
            className={`absolute bg-white rounded-lg shadow-lg overflow-hidden cursor-move
              ${draggedItem === question.id ? 'shadow-xl z-10' : ''}
              ${isResizing === question.id ? 'select-none' : ''}`}
            style={{
              left: question.board_position?.x || 0,
              top: question.board_position?.y || 0,
              width: question.board_position?.width || 320,
              height: question.board_position?.height || 240,
              transform: `scale(${1 / zoom})`,
              transformOrigin: '0 0'
            }}
            onMouseDown={(e) => handleMouseDown(e, question.id)}
          >
            {/* ... (содержимое карточки) */}
          </div>
        ))}
      </div>

      {/* ... (остальная часть компонента) */}
    </div>
  );
}