import React, { useState, useRef, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Move, RotateCw, ZoomIn, ZoomOut, Plus, Save, Grid, Eye, X, Edit, Trash, Image as ImageIcon, Settings, FormInput, ArrowRight } from 'lucide-react';
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
  onNavigateToSubboard?: (questionId: number) => void;
}

export function MiroBoard({ parentId, questions, onUpdateQuestions, onNavigateToSubboard }: MiroBoardProps) {
  const [boardQuestions, setBoardQuestions] = useState<Question[]>([]);
  const [parentQuestion, setParentQuestion] = useState<Question | null>(null);
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
    // Find parent question
    const parent = questions.find(q => q.id === parentId);
    setParentQuestion(parent || null);

    // Get subtopics - filter questions that have this parentId as their parent_id
    const subtopics = questions.filter(q => q.parent_id === parentId);
    const questionsWithPositions = subtopics.map(q => ({
  ...q,
  board_position: q.board_position || { // Add default position
    x: Math.random() * 600 + 200,
    y: Math.random() * 400 + 300,
    width: 320,
    height: 240
  }
}));
    setBoardQuestions(questionsWithPositions);
  }, [questions, parentId]);

  const hasSubtopics = (questionId: number) => {
    return questions.some(q => q.parent_id === questionId);
  };

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
              x: Math.random() * 600 + 200,
              y: Math.random() * 400 + 300,
              width: 320,
              height: 240
            }
          }
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
    <div 
      ref={boardRef}
      className="relative w-full h-full overflow-hidden bg-gray-100"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={handleBoardMouseDown}
      onWheel={handleWheel}
    >
      {/* Controls */}
      <div className="absolute top-4 left-4 flex gap-2 z-10">
        <button 
          onClick={resetView}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
          title="Reset View"
        >
          <RotateCw size={20} />
        </button>
        <button 
          onClick={() => setZoom(prev => Math.min(3, prev * 1.2))}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button 
          onClick={() => setZoom(prev => Math.max(0.1, prev * 0.8))}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <button 
          onClick={fitToScreen}
          className="p-2 bg-white rounded-lg shadow hover:bg-gray-50"
          title="Fit to Screen"
        >
          <Move size={20} />
        </button>
        <button 
          onClick={() => setShowGrid(!showGrid)}
          className={`p-2 rounded-lg shadow hover:bg-gray-50 ${showGrid ? 'bg-blue-100' : 'bg-white'}`}
          title="Toggle Grid"
        >
          <Grid size={20} />
        </button>
      </div>

      {/* Add Question Button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg shadow hover:bg-blue-600"
        >
          <Plus size={20} />
          Add Question
        </button>
      </div>

      {/* Add Question Form */}
      {showAddForm && (
        <div className="absolute top-16 right-4 w-80 bg-white rounded-lg shadow-lg p-4 z-20">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium">Add New Question</h3>
            <button onClick={() => setShowAddForm(false)} className="text-gray-500 hover:text-gray-700">
              <X size={20} />
            </button>
          </div>
          <textarea
            value={newQuestionContent}
            onChange={(e) => setNewQuestionContent(e.target.value)}
            className="w-full h-32 p-2 border rounded-lg mb-4"
            placeholder="Enter your question..."
          />
          <button
            onClick={handleAddQuestion}
            className="w-full py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          >
            Add Question
          </button>
          {error && <div className="mt-2 text-red-500 text-sm">{error}</div>}
        </div>
      )}

      {/* Grid */}
      {showGrid && (
        <div 
          className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: 'linear-gradient(to right, #e5e7eb 1px, transparent 1px), linear-gradient(to bottom, #e5e7eb 1px, transparent 1px)',
            backgroundSize: `${50 * zoom}px ${50 * zoom}px`,
            transform: `translate(${pan.x}px, ${pan.y}px)`
          }}
        />
      )}

      {/* Questions */}
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
              left: question.board_position!.x,
              top: question.board_position!.y,
              width: question.board_position!.width,
              height: question.board_position!.height,
              transform: `scale(${1 / zoom})`,
              transformOrigin: '0 0'
            }}
            onMouseDown={(e) => handleMouseDown(e, question.id)}
          >
            {/* Question Content */}
            <div className="p-4 h-full flex flex-col">
              {editingQuestion === question.id ? (
                <div className="flex-1">
                  <input
                    value={editingContent}
                    onChange={(e) => setEditingContent(e.target.value)}
                    className="w-full p-2 border rounded mb-2"
                    placeholder="Question content..."
                  />
                  <textarea
                    value={editingDescription}
                    onChange={(e) => setEditingDescription(e.target.value)}
                    className="w-full h-24 p-2 border rounded"
                    placeholder="Description..."
                  />
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setEditingQuestion(null)}
                      className="px-3 py-1 text-sm text-gray-600 hover:text-gray-800"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => handleUpdateQuestion(question.id)}
                      className="px-3 py-1 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h3 className="font-medium mb-2">{question.content}</h3>
                  <p className="text-sm text-gray-600 flex-1">{question.description}</p>
                </>
              )}

              {/* Actions */}
              <div className="flex justify-between items-center mt-4">
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setEditingQuestion(question.id);
                      setEditingContent(question.content);
                      setEditingDescription(question.description);
                    }}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Edit"
                  >
                    <Edit size={16} />
                  </button>
                  <button
                    onClick={() => handleDeleteQuestion(question.id)}
                    className="p-1 text-gray-500 hover:text-red-500"
                    title="Delete"
                  >
                    <Trash size={16} />
                  </button>
                  <button
                    onClick={() => setEditingImage(question.id)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Add/Edit Image"
                  >
                    <ImageIcon size={16} />
                  </button>
                  {question.image_url && (
                    <button
                      onClick={() => setPositioningImage(question.id)}
                      className="p-1 text-gray-500 hover:text-gray-700"
                      title="Image Positioning"
                    >
                      <Settings size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowForm(question.id)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="View Form"
                  >
                    <Eye size={16} />
                  </button>
                  <button
                    onClick={() => setShowFormSettings(question.id)}
                    className="p-1 text-gray-500 hover:text-gray-700"
                    title="Form Settings"
                  >
                    <FormInput size={16} />
                  </button>
                </div>
                {hasSubtopics(question.id) && onNavigateToSubboard && (
                  <button
                    onClick={() => onNavigateToSubboard(question.id)}
                    className="p-1 text-orange-500 hover:text-orange-600"
                    title="Open Subtopics"
                  >
                    <ArrowRight size={16} />
                  </button>
                )}
              </div>
            </div>

            {/* Resize Handles */}
            <div
              className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize"
              onMouseDown={(e) => handleResize(question.id, 'bottom-right', e)}
            />
          </div>
        ))}
      </div>

      {/* Instructions */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 text-xs text-gray-600 max-w-xs">
        <div className="font-medium mb-1">Controls:</div>
        <div>• Drag cards to move them</div>
        <div>• Use mouse wheel to zoom</div>
        <div>• Drag background to pan</div>
        <div>• Drag corners to resize cards</div>
        <div>• Hover over cards for actions</div>
        <div>• Orange button → open subtopics</div>
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

      {editingImage !== null && (
        <ImageUpload
          questionId={editingImage}
          currentImageUrl={boardQuestions.find(q => q.id === editingImage)?.image_url || ''}
          onSave={updateTopicImage}
          onClose={() => setEditingImage(null)}
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