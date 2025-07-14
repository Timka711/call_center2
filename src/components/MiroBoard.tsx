import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Move, RotateCw, ZoomIn, ZoomOut, Plus, Save, Grid, Eye, X, Edit, Trash, Image as ImageIcon, Settings, FormInput } from 'lucide-react';
import { QuestionForm } from './QuestionForm';
import { FormSettings } from './FormSettings';
import { ImageUpload } from './ImageUpload';
import { ImagePositioning, ImagePositioning as ImagePositioningType } from './ImagePositioning';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}

interface Question {
  id: number;
  content: string;
  description: string;
  parent_id: number | null;
  created_at: string;
  user_id: string;
  form_fields: FormField[];
  answer_template: string;
  has_form: boolean;
  image_url: string | null;
  image_positioning: ImagePositioningType | null;
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
}

export function MiroBoard({ parentId, questions, onUpdateQuestions }: MiroBoardProps) {
  const [boardQuestions, setBoardQuestions] = useState<Question[]>([]);
  const [draggedItem, setDraggedItem] = useState<number | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const [isResizing, setIsResizing] = useState<number | null>(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newQuestionContent, setNewQuestionContent] = useState('');
  const [editingQuestion, setEditingQuestion] = useState<number | null>(null);
  const [editingContent, setEditingContent] = useState('');
  const [editingDescription, setEditingDescription] = useState('');
  const [showForm, setShowForm] = useState<number | null>(null);
  const [showFormSettings, setShowFormSettings] = useState<number | null>(null);
  const [editingImage, setEditingImage] = useState<number | null>(null);
  const [positioningImage, setPositioningImage] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const boardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const subtopics = questions.filter(q => q.parent_id === parentId);
    const questionsWithPositions = subtopics.map(q => ({
      ...q,
      board_position: q.board_position || {
        x: Math.random() * 800,
        y: Math.random() * 600,
        width: 320,
        height: 240
      }
    }));
    setBoardQuestions(questionsWithPositions);
  }, [questions, parentId]);

  const handleMouseDown = (e: React.MouseEvent, questionId: number) => {
    if (e.button !== 0) return; // Only left click
    
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
    setIsResizing(null);
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

  const handleResize = (questionId: number, direction: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setIsResizing(questionId);
    
    const handleMouseMove = (e: MouseEvent) => {
      setBoardQuestions(prev => prev.map(q => {
        if (q.id !== questionId) return q;
        
        const position = q.board_position!;
        let newWidth = position.width;
        let newHeight = position.height;
        
        if (direction.includes('right')) {
          newWidth = Math.max(250, position.width + e.movementX / zoom);
        }
        if (direction.includes('bottom')) {
          newHeight = Math.max(200, position.height + e.movementY / zoom);
        }
        
        return {
          ...q,
          board_position: { ...position, width: newWidth, height: newHeight }
        };
      }));
    };

    const handleMouseUp = () => {
      setIsResizing(null);
      saveBoardPositions();
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
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

  const fitToScreen = () => {
    if (boardQuestions.length === 0) return;
    
    const minX = Math.min(...boardQuestions.map(q => q.board_position!.x));
    const minY = Math.min(...boardQuestions.map(q => q.board_position!.y));
    const maxX = Math.max(...boardQuestions.map(q => q.board_position!.x + q.board_position!.width));
    const maxY = Math.max(...boardQuestions.map(q => q.board_position!.y + q.board_position!.height));
    
    const contentWidth = maxX - minX;
    const contentHeight = maxY - minY;
    
    const boardRect = boardRef.current?.getBoundingClientRect();
    if (!boardRect) return;
    
    const scaleX = (boardRect.width - 100) / contentWidth;
    const scaleY = (boardRect.height - 100) / contentHeight;
    const newZoom = Math.min(scaleX, scaleY, 1);
    
    setZoom(newZoom);
    setPan({
      x: (boardRect.width - contentWidth * newZoom) / 2 - minX * newZoom,
      y: (boardRect.height - contentHeight * newZoom) / 2 - minY * newZoom
    });
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
            has_form: false,
            form_fields: [],
            answer_template: '',
            image_url: null,
            image_positioning: null,
            board_position: {
              x: Math.random() * 800,
              y: Math.random() * 600,
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
      const question = boardQuestions.find(q => q.id === questionId);
      
      // Delete image if exists
      if (question?.image_url) {
        const fileName = question.image_url.split('/').pop();
        if (fileName) {
          await supabase.storage
            .from('question-images')
            .remove([fileName]);
        }
      }

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

  const updateTopicImage = async (topicId: number, imageUrl: string) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('questions')
        .update({ image_url: imageUrl || null })
        .eq('id', topicId);

      if (error) throw error;

      onUpdateQuestions();
      setEditingImage(null);
    } catch (err) {
      console.error('Error updating topic image:', err);
      setError('Failed to update topic image. Please try again.');
    }
  };

  const updateImagePositioning = async (topicId: number, positioning: ImagePositioningType) => {
    try {
      setError(null);
      const { error } = await supabase
        .from('questions')
        .update({ image_positioning: positioning })
        .eq('id', topicId);

      if (error) throw error;

      onUpdateQuestions();
      setPositioningImage(null);
    } catch (err) {
      console.error('Error updating image positioning:', err);
      setError('Failed to update image positioning. Please try again.');
    }
  };

  return (
    <div className="w-full h-screen bg-gray-100 relative overflow-hidden">
      {/* Toolbar */}
      <div className="absolute top-4 left-4 z-10 bg-white rounded-lg shadow-lg p-2 flex items-center gap-2">
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
          <RotateCw className="w-4 h-4" />
        </button>
        <button
          onClick={fitToScreen}
          className="p-2 hover:bg-gray-100 rounded"
          title="Вместить в экран"
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
            width: '2000px',
            height: '2000px',
            position: 'relative'
          }}
        >
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
                {question.image_url && editingImage !== question.id && (
                  <div className="w-full h-20 mb-3 overflow-hidden rounded">
                    <img
                      src={question.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}

                {editingImage === question.id && (
                  <div className="mb-3">
                    <ImageUpload
                      currentImage={question.image_url}
                      onUpload={(url) => updateTopicImage(question.id, url)}
                      onCancel={() => setEditingImage(null)}
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
                      {question.has_form && (
                        <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">
                          Форма
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
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingImage(question.id);
                    }}
                    className="p-1 bg-green-600 text-white rounded hover:bg-green-700"
                    title="Изображение"
                  >
                    <ImageIcon className="w-3 h-3" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowFormSettings(question.id);
                    }}
                    className="p-1 bg-purple-600 text-white rounded hover:bg-purple-700"
                    title="Форма"
                  >
                    <Settings className="w-3 h-3" />
                  </button>
                  {question.has_form && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setShowForm(question.id);
                      }}
                      className="p-1 bg-indigo-600 text-white rounded hover:bg-indigo-700"
                      title="Заполнить форму"
                    >
                      <FormInput className="w-3 h-3" />
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

              {/* Resize handles */}
              {!draggedItem && editingQuestion !== question.id && (
                <>
                  <div
                    className="absolute bottom-0 right-0 w-3 h-3 bg-gray-400 cursor-se-resize opacity-0 hover:opacity-100 transition-opacity"
                    onMouseDown={(e) => handleResize(question.id, 'bottom-right', e)}
                    style={{ clipPath: 'polygon(100% 0, 100% 100%, 0 100%)' }}
                  />
                  <div
                    className="absolute bottom-0 right-0 w-4 h-1 cursor-s-resize opacity-0 hover:opacity-50 hover:bg-gray-400 transition-all"
                    onMouseDown={(e) => handleResize(question.id, 'bottom', e)}
                  />
                  <div
                    className="absolute bottom-0 right-0 w-1 h-4 cursor-e-resize opacity-0 hover:opacity-50 hover:bg-gray-400 transition-all"
                    onMouseDown={(e) => handleResize(question.id, 'right', e)}
                  />
                </>
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
        <div>• Тяните за углы карточек для изменения размера</div>
        <div>• Наведите на карточку для действий</div>
      </div>

      {/* Modals */}
      {showForm !== null && (
        <QuestionForm
          questionId={showForm}
          formFields={boardQuestions.find(q => q.id === showForm)?.form_fields || []}
          answerTemplate={boardQuestions.find(q => q.id === showForm)?.answer_template || ''}
          onClose={() => setShowForm(null)}
        />
      )}

      {showFormSettings !== null && (
        <FormSettings
          questionId={showFormSettings}
          initialFields={boardQuestions.find(q => q.id === showFormSettings)?.form_fields || []}
          initialTemplate={boardQuestions.find(q => q.id === showFormSettings)?.answer_template || ''}
          onClose={() => setShowFormSettings(null)}
          onUpdate={onUpdateQuestions}
        />
      )}

      {positioningImage !== null && (
        <ImagePositioning
          imageUrl={boardQuestions.find(q => q.id === positioningImage)?.image_url || ''}
          initialPositioning={boardQuestions.find(q => q.id === positioningImage)?.image_positioning || undefined}
          onSave={(positioning) => updateImagePositioning(positioningImage, positioning)}
          onClose={() => setPositioningImage(null)}
        />
      )}
    </div>
  );
}