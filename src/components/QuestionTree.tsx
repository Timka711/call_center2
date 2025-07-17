import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Plus, ChevronRight } from 'lucide-react';
import { MiroBoard } from './MiroBoard';
import { WaveBackground } from './WaveBackground';
import { CallCenterLoader } from './CallCenterLoader';

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

export function QuestionTree() {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [breadcrumbs, setBreadcrumbs] = useState<Question[]>([]);
  const [boardStack, setBoardStack] = useState<number[]>([]);

  useEffect(() => {
    fetchQuestions();
  }, []);

  async function fetchQuestions() {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase
        .from('questions')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setQuestions(data || []);
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function addQuestion() {
    if (!newQuestion.trim()) return;

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
            content: newQuestion,
            description: '',
            parent_id: selectedQuestion,
            user_id: user.id,
            image_url: null,
            board_position: selectedQuestion ? {
              x: Math.random() * 600 + 200,
              y: Math.random() * 400 + 300,
              width: 320,
              height: 240
            } : null
          },
        ]);

      if (error) throw error;

      setNewQuestion('');
      fetchQuestions();
    } catch (err) {
      console.error('Error adding question:', err);
      setError('Failed to add question. Please try again.');
    }
  }

  const handleQuestionClick = (question: Question) => {
    if (hasSubtopics(question.id)) {
      const newBreadcrumbs = [...breadcrumbs, question];
      setBreadcrumbs(newBreadcrumbs);
      setSelectedQuestion(question.id);
      setBoardStack([question.id]);
    }
  };

  const handleNavigateToSubboard = (questionId: number) => {
    const question = questions.find(q => q.id === questionId);
    if (question) {
      const newBreadcrumbs = [...breadcrumbs, question];
      setBreadcrumbs(newBreadcrumbs);
      setSelectedQuestion(questionId);
      setBoardStack([...boardStack, questionId]);
    }
  };

  const handleBreadcrumbClick = (index: number) => {
    if (index === -1) {
      setBreadcrumbs([]);
      setSelectedQuestion(null);
      setBoardStack([]);
    } else {
      const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
      setBreadcrumbs(newBreadcrumbs);
      setSelectedQuestion(newBreadcrumbs[newBreadcrumbs.length - 1]?.id || null);
      setBoardStack(boardStack.slice(0, index + 1));
    }
  };

  const getTopLevelQuestions = () => {
    return questions.filter(q => q.parent_id === null);
  };

  const hasSubtopics = (questionId: number) => {
    return questions.some(q => q.parent_id === questionId);
  };

  if (loading) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <CallCenterLoader />
        </div>
        <WaveBackground />
      </>
    );
  }

  // Show board if we have selected question with subtopics
  if (selectedQuestion !== null && boardStack.length > 0) {
    return (
      <MiroBoard 
        parentId={boardStack[boardStack.length - 1]}
        questions={questions}
        onUpdateQuestions={fetchQuestions}
        onNavigateToSubboard={handleNavigateToSubboard}
        breadcrumbs={breadcrumbs}
        onBreadcrumbClick={handleBreadcrumbClick}
      />
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-6 bg-indigo-50 min-h-screen relative z-10">
        {error && (
          <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
            {error}
          </div>
        )}

        {/* Breadcrumbs */}
        {breadcrumbs.length > 0 && (
          <nav className="flex items-center space-x-2 text-sm text-gray-600 mb-6">
            <button
              onClick={() => handleBreadcrumbClick(-1)}
              className="hover:text-indigo-600 font-medium"
            >
              Главная
            </button>
            {breadcrumbs.map((crumb, index) => (
              <React.Fragment key={crumb.id}>
                <ChevronRight className="w-4 h-4" />
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="hover:text-indigo-600"
                >
                  {crumb.content}
                </button>
              </React.Fragment>
            ))}
          </nav>
        )}

        {/* Add new question form */}
        <div className="mb-6 bg-white rounded-lg shadow-md p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={newQuestion}
              onChange={(e) => setNewQuestion(e.target.value)}
              placeholder="Добавить новую тему..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              onKeyPress={(e) => e.key === 'Enter' && addQuestion()}
            />
            <button
              onClick={addQuestion}
              className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить
            </button>
          </div>
        </div>

        {/* Questions list */}
        <div className="space-y-4">
          {getTopLevelQuestions().length === 0 ? (
            <div className="text-center py-12 bg-white rounded-lg shadow-md">
              <p className="text-gray-500 text-lg">Нет тем</p>
              <p className="text-gray-400 text-sm mt-2">Добавьте первую тему выше</p>
            </div>
          ) : (
            getTopLevelQuestions().map((question) => (
              <div key={question.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="p-6">
                  {question.image_url && (
                    <div className="w-full h-48 mb-4 overflow-hidden rounded-lg">
                      <img
                        src={question.image_url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between mb-2">
                    <h3 
                      className="text-xl font-semibold text-gray-900 cursor-pointer hover:text-indigo-600"
                      onClick={() => handleQuestionClick(question)}
                    >
                      {question.content}
                    </h3>
                    {hasSubtopics(question.id) && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800">
                        {questions.filter(q => q.parent_id === question.id).length} подтем
                      </span>
                    )}
                  </div>

                  {question.description && (
                    <p className="text-lg text-gray-800 font-medium mb-4">
                      {question.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-500">
                      {new Date(question.created_at).toLocaleDateString('ru-RU')}
                    </span>
                    
                    {hasSubtopics(question.id) && (
                      <button
                        onClick={() => handleQuestionClick(question)}
                        className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-indigo-600 bg-indigo-100 hover:bg-indigo-200"
                      >
                        <ChevronRight className="w-4 h-4 mr-1" />
                        Открыть подтемы
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      <WaveBackground />
    </>
  );
}