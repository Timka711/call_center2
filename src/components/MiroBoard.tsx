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

    // Get subtopics
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
        <div>• Оранжевая кнопка → открыть подтемы</div>
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