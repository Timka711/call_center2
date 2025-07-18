import React, { useState, useRef, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { Move, ZoomIn, ZoomOut, Plus, Save, Grid, Eye, X, Edit, Trash, ArrowRight, ChevronRight } from 'lucide-react';

interface Question {
  id: number;
  content: string;
  description: string;
  parent_id: number | null;
  created_at: string;
  user_id: string;
  image_url: string | null;
  board_position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

interface MiroBoardProps {
  parentId: number;
  questions: Question[];
  onUpdateQuestions: () => void;
  onNavigateToSubboard?: (questionId: number) => void;
  breadcrumbs: Question[];
  onBreadcrumbClick: (index: number) => void;
}

export function MiroBoard({ parentId, questions, onUpdateQuestions, onNavigateToSubboard, breadcrumbs, onBreadcrumbClick }: MiroBoardProps) {
  const [boardQuestions, setBoardQuestions] = useState<Question[]>([]);
  const [parentQuestion, setParentQuestion] = useState<Question | null>(null);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [error, setError] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  
  // Состояние для размеров контейнера
  const [containerSize, setContainerSize] = useState({ 
    width: 2000, 
    height: 2000 
  });

  // Реф и состояние для размеров родительской карточки
  const parentContentRef = useRef<HTMLDivElement>(null);
  const [parentDimensions, setParentDimensions] = useState({ 
    width: 400, 
    height: 120 
  });

  useEffect(() => {
    const parent = questions.find(q => q.id === parentId);
    setParentQuestion(parent || null);

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

  // Эффект для расчета размеров родительской карточки
  useEffect(() => {
    if (parentContentRef.current && parentQuestion) {
      // Рассчитываем необходимую высоту на основе содержимого
      const contentHeight = parentContentRef.current.scrollHeight;
      
      // Рассчитываем ширину (минимальная 400px, максимальная 600px)
      const contentWidth = Math.max(800, Math.min(1200, parentContentRef.current.scrollWidth));
      
      // Добавляем вертикальный отступ
      const height = Math.max(120, contentHeight + 40);
      
      setParentDimensions({
        width: contentWidth,
        height: height
      });
    }
  }, [parentQuestion]);

  // Пересчет размеров контейнера
  const calculateContainerSize = useCallback(() => {
    const padding = 300; // Отступы вокруг содержимого
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;

    // Учитываем родительский элемент
    if (parentQuestion) {
      minX = Math.min(minX, 400);
      minY = Math.min(minY, 100);
      maxX = Math.max(maxX, 400 + parentDimensions.width);
      maxY = Math.max(maxY, 100 + parentDimensions.height);
    }

    // Учитываем дочерние элементы
    boardQuestions.forEach(question => {
      if (question.board_position) {
        const { x, y, width, height } = question.board_position;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + width);
        maxY = Math.max(maxY, y + height);
      }
    });

    // Если элементов нет, используем значения по умолчанию
    if (minX === Infinity || maxX === -Infinity) {
      return { 
        width: 2000, 
        height: 2000 
      };
    }

    return {
      width: Math.max(1000, maxX - minX + padding * 2),
      height: Math.max(800, maxY - minY + padding * 2)
    };
  }, [boardQuestions, parentQuestion, parentDimensions]);

  // Обновление размеров при изменениях
  useEffect(() => {
    const newSize = calculateContainerSize();
    setContainerSize(newSize);
  }, [boardQuestions, parentQuestion, parentDimensions, calculateContainerSize]);

  // Обновление размеров при перемещении элементов
  useEffect(() => {
    if (draggedItem === null) {
      const newSize = calculateContainerSize();
      setContainerSize(newSize);
    }
  }, [draggedItem, calculateContainerSize]);

  const hasSubtopics = (questionId: number) => {
    return questions.some(q => q.parent_id === questionId);
  };

  const handleMouseDown = (e: React.MouseEvent, questionId: number) => {
    if (e.button !== 0) return;
    
    const question = boardQuestions.find(q => q.id === questionId);
    if (!question) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const offsetY = e.clientY - rect.top;

    setDraggedItem(questionId);
    setDragOffset({ x: offsetX, y: offsetY });
    e.preventDefault();
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (draggedItem !== null) {
      const boardRect = boardRef.current?.getBoundingClientRect();
      if (!boardRect) return;

      const x = (e.clientX - boardRect.left - dragOffset.x - pan.x) / zoom;
      const y = (e.clientY - boardRect.top - dragOffset.y - pan.y) / zoom;

      setBoardQuestions(prev => prev.map(q => 
        q.id === draggedItem 
          ? { ...q, board_position: { ...q.board_position!, x: Math.max(0, x), y: Math.max(0, y) } }
          : q
      ));
    } else if (isPanning) {
      const deltaX = e.clientX - panStart.x;
      const deltaY = e.clientY - panStart.y;
      setPan(prev => ({ x: prev.x + deltaX, y: prev.y + deltaY }));
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleMouseUp = () => {
    if (draggedItem !== null) {
      saveBoardPositions();
    }
    setDraggedItem(null);
    setIsPanning(false);
  };

  const handleBoardMouseDown = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setIsPanning(true);
      setPanStart({ x: e.clientX, y: e.clientY });
    }
  };

  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.1, Math.min(3, prev * delta)));
  };

  const saveBoardPositions = async () => {
    try {
      for (const question of boardQuestions) {
        await supabase
          .from('questions')
          .update({ board_position: question.board_position })
          .eq('id', question.id);
      }
    } catch (error) {
      console.error('Error saving board positions:', error);
    }
  };

  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleAddQuestion = async () => {
    if (!newQuestionContent.trim()) return;

    try {
      setError(null);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('You must be logged in to add questions');
        return;
      }

      const { error } = await supabase
        .from('questions')
        .insert([
          {
            content: newQuestionContent,
            description: '',
            parent_id: parentId,
            user_id: user.id,
            image_url: null,
            board_position: {
              x: Math.random() * 600 + 200,
              y: Math.random() * 400 + 300,
              width: 320,
              height: 240
            }
          },
        ]);

      if (error) throw error;

      setNewQuestionContent('');
      setShowAddForm(false);
      onUpdateQuestions();
    } catch (err) {
      console.error('Error adding question:', err);
      setError('Failed to add question. Please try again.');
    }
  };

  const handleUpdateQuestion = async (questionId: number) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('questions')
        .update({ 
          content: editingContent,
          description: editingDescription
        })
        .eq('id', questionId);

      if (error) throw error;

      setEditingQuestion(null);
      setEditingContent('');
      setEditingDescription('');
      onUpdateQuestions();
    } catch (err) {
      console.error('Error updating question:', err);
      setError('Failed to update question. Please try again.');
    }
  };

  const handleDeleteQuestion = async (questionId: number) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('questions')
        .delete()
        .eq('id', questionId);

      if (error) throw error;
      onUpdateQuestions();
    } catch (err) {
      console.error('Error deleting question:', err);
      setError('Failed to delete question. Please try again.');
    }
  };

  const getArrowPath = (fromX: number, fromY: number, toX: number, toY: number) => {
    const dx = toX - fromX;
    const dy = toY - fromY;
    
    const controlX1 = fromX + dx * 0.3;
    const controlY1 = fromY;
    const controlX2 = toX - dx * 0.3;
    const controlY2 = toY;
    
    return `M ${fromX} ${fromY} C ${controlX1} ${controlY1}, ${controlX2} ${controlY2}, ${toX} ${toY}`;
  };

  const parentPosition = parentQuestion ? { 
    x: 400, 
    y: 100, 
    width: parentDimensions.width, 
    height: parentDimensions.height 
  } : null;

  return (
    <div className="w-full h-screen bg-gray-100 relative overflow-hidden">
      {/* Breadcrumbs */}
      <nav className="absolute top-4 left-4 right-4 z-20 flex items-center space-x-2 text-sm text-gray-600 bg-white rounded-lg shadow-lg p-3">
        <button
          onClick={() => onBreadcrumbClick(-1)}
          className="hover:text-indigo-600 font-medium"
        >
          Главная
        </button>
        {breadcrumbs.map((crumb, index) => (
          <React.Fragment key={crumb.id}>
            <ChevronRight className="w-4 h-4" />
            <button
              onClick={() => onBreadcrumbClick(index)}
              className="hover:text-indigo-600"
            >
              {crumb.content}
            </button>
          </React.Fragment>
        ))}
      </nav>

      {/* Toolbar */}
      <div className="absolute top-20 left-4 z-10 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
        <button
          onClick={() => setShowAddForm(true)}
          className="p-2 hover:bg-gray-100 rounded text-green-600"
          title="Добавить подтему"
        >
          <Plus className="w-4 h-4" />
        </button>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="p-2 hover:bg-gray-100 rounded"
          title="Увеличить"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
          className="p-2 hover:bg-gray-100 rounded"
          title="Уменьшить"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <div className="text-sm text-gray-600 px-2">
          {Math.round(zoom * 100)}%
        </div>
        <div className="w-px h-6 bg-gray-300" />
        <button
          onClick={resetView}
          className="p-2 hover:bg-gray-100 rounded"
          title="Сбросить вид"
        >
          <Eye className="w-4 h-4" />
        </button>
        <button
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded ${showGrid ? 'bg-indigo-100 text-indigo-600' : 'hover:bg-gray-100'}`}
          title="Показать сетку"
        >
          <Grid className="w-4 h-4" />
        </button>
        <button
          onClick={saveBoardPositions}
          className="p-2 hover:bg-gray-100 rounded text-green-600"
          title="Сохранить позиции"
        >
          <Save className="w-4 h-4" />
        </button>
      </div>

      {/* Error display */}
      {error && (
        <div className="absolute top-4 right-4 z-10 bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg max-w-md">
          {error}
        </div>
      )}

      {/* Add form modal */}
      {showAddForm && (
        <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center z-20">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Добавить новую подтему</h3>
            <input
              type="text"
              value={newQuestionContent}
              onChange={(e) => setNewQuestionContent(e.target.value)}
              placeholder="Введите название подтемы..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 mb-4"
              autoFocus
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewQuestionContent('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                onClick={handleAddQuestion}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Board */}
      <div
        ref={boardRef}
        className="w-full h-full cursor-grab active:cursor-grabbing"
        onMouseDown={handleBoardMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
        style={{
          backgroundImage: showGrid ? `
            radial-gradient(circle, #e5e7eb 1px, transparent 1px)
          ` : 'none',
          backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`
        }}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            position: 'relative',
            width: `${containerSize.width}px`,
            height: `${containerSize.height}px`
          }}
        >
          {/* SVG for arrows */}
          <svg
            className="absolute inset-0 pointer-events-none"
            style={{ width: '100%', height: '100%' }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="#6366f1"
                />
              </marker>
            </defs>
            
            {/* Arrows from parent to children */}
            {parentPosition && boardQuestions.map((question) => {
              const fromX = parentPosition.x + parentPosition.width / 2;
              const fromY = parentPosition.y + parentPosition.height;
              const toX = question.board_position!.x + question.board_position!.width / 2;
              const toY = question.board_position!.y;
              
              return (
                <path
                  key={`arrow-${question.id}`}
                  d={getArrowPath(fromX, fromY, toX, toY)}
                  stroke="#6366f1"
                  strokeWidth="2"
                  fill="none"
                  markerEnd="url(#arrowhead)"
                  opacity="0.7"
                />
              );
            })}
          </svg>

          {/* Parent question card */}
          {parentQuestion && parentPosition && (
            <div
              className="absolute bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg shadow-xl border-2 border-indigo-300 text-white"
              style={{
                left: parentPosition.x,
                top: parentPosition.y,
                width: parentPosition.width,
                height: parentPosition.height,
                zIndex: 10
              }}
            >
              {/* Скрытый элемент для измерения размеров контента */}
              <div 
                ref={parentContentRef}
                className="invisible absolute"
              >
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                  <span className="text-sm font-medium opacity-90">Родительская тема</span>
                </div>
                <h2 className="text-xl font-bold mb-2">{parentQuestion.content}</h2>
                {parentQuestion.description && (
                  <p className="text-sm opacity-90">{parentQuestion.description}</p>
                )}
              </div>
              
              {/* Фактическое отображаемое содержимое */}
              <div className="p-6 h-full flex flex-col justify-center overflow-hidden">
                <div className="flex items-center mb-2">
                  <div className="w-3 h-3 bg-white rounded-full mr-2"></div>
                  <span className="text-sm font-medium opacity-90">Родительская тема</span>
                </div>
                <h2 className="text-xl font-bold mb-2 break-words">
                  {parentQuestion.content}
                </h2>
                {parentQuestion.description && (
                  <p className="text-sm opacity-90 break-words overflow-auto max-h-[100px]">
                    {parentQuestion.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Child question cards */}
          {boardQuestions.map((question) => (
            <div
              key={question.id}
              className={`absolute bg-white rounded-lg shadow-lg border-2 cursor-move select-none ${
                draggedItem === question.id ? 'border-indigo-500 shadow-xl' : 'border-gray-200 hover:border-gray-300'
              } ${editingQuestion === question.id ? 'border-blue-500' : ''}`}
              style={{
                left: question.board_position!.x,
                top: question.board_position!.y,
                width: question.board_position!.width,
                height: question.board_position!.height,
                zIndex: draggedItem === question.id ? 1000 : editingQuestion === question.id ? 999 : 1
              }}
              onMouseDown={(e) => {
                if (editingQuestion !== question.id) {
                  handleMouseDown(e, question.id);
                }
              }}
            >
              {/* Content */}
              <div className="p-4 h-full flex flex-col">
                {question.image_url && (
                  <div className="w-full h-20 mb-3 overflow-hidden rounded">
                    <img
                      src={question.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {editingQuestion === question.id ? (
                  <div className="flex-1 flex flex-col gap-2">
                    <input
                      type="text"
                      value={editingContent}
                      onChange={(e) => setEditingContent(e.target.value)}
                      className="w-full px-2 py-1 text-sm border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      placeholder="Название"
                    />
                    <textarea
                      value={editingDescription}
                      onChange={(e) => setEditingDescription(e.target.value)}
                      className="w-full px-2 py-1 text-xs border rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 flex-1 resize-none"
                      placeholder="Описание"
                    />
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleUpdateQuestion(question.id)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700"
                      >
                        Сохранить
                      </button>
                      <button
                        onClick={() => {
                          setEditingQuestion(null);
                          setEditingContent('');
                          setEditingDescription('');
                        }}
                        className="px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                      >
                        Отмена
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-tight">
                      {question.content}
                    </h3>
                    <p className="text-xs text-gray-800 flex-1 overflow-hidden mb-2">
                      {question.description || 'Нет описания'}
                    </p>
                    
                    {/* Actions */}
                    <div className="flex flex-wrap gap-1 mt-auto">
                      {hasSubtopics(question.id) && (
                        <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">
                          {questions.filter(q => q.parent_id === question.id).length} подтем
                        </span>
                      )}
                    </div>
                  </>
                )}
              </div>

              {/* Action buttons */}
              {editingQuestion !== question.id && (
                <div className="absolute top-2 right-2 flex gap-1 opacity-0 hover:opacity-100 transition-opacity">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingQuestion(question.id);
                      setEditingContent(question.content);
                      setEditingDescription(question.description);
                    }}
                    className="p-1 bg-blue-600 text-white rounded hover:bg-blue-700"
                    title="Редактировать"
                  >
                    <Edit className="w-3 h-3" />
                  </button>
                  {hasSubtopics(question.id) && onNavigateToSubboard && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onNavigateToSubboard(question.id);
                      }}
                      className="p-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                      title="Открыть подтемы"
                    >
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm('Удалить эту подтему?')) {
                        handleDeleteQuestion(question.id);
                      }
                    }}
                    className="p-1 bg-red-600 text-white rounded hover:bg-red-700"
                    title="Удалить"
                  >
                    <Trash className="w-3 h-3" />
                  </button>
                </div>
              )}

              {/* Move handle */}
              {editingQuestion !== question.id && (
                <div className="absolute top-2 left-2 opacity-0 hover:opacity-100 transition-opacity">
                  <Move className="w-4 h-4 text-gray-400" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs text-gray-600 max-w-xs">
        <div className="font-medium mb-1">Управление:</div>
        <div>• Перетаскивайте карточки для перемещения</div>
        <div>• Используйте колесо мыши для масштабирования</div>
        <div>• Перетаскивайте фон для панорамирования</div>
        <div>• Наведите на карточку для действий</div>
        <div>• Оранжевая кнопка → открыть подтемы</div>
      </div>

      {/* Debug info */}
      <div className="absolute top-20 right-4 z-10 bg-white rounded-lg shadow-lg p-2 text-xs">
        Размер контейнера: {Math.round(containerSize.width)}x{Math.round(containerSize.height)}px
        <br />
        Размер родителя: {Math.round(parentDimensions.width)}x{Math.round(parentDimensions.height)}px
      </div>
    </div>
  );
}