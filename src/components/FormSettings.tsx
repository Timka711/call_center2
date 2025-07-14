import React, { useState } from 'react';
import { Save, Plus, Trash, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface FormField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select';
  options?: string[];
  required?: boolean;
}

interface FormSettingsProps {
  questionId: number;
  initialFields: FormField[];
  initialTemplate: string;
  onClose: () => void;
  onUpdate: () => void;
}

export function FormSettings({ questionId, initialFields, initialTemplate, onClose, onUpdate }: FormSettingsProps) {
  const [fields, setFields] = useState<FormField[]>(initialFields);
  const [template, setTemplate] = useState(initialTemplate);
  const [error, setError] = useState<string | null>(null);

  const addField = () => {
    setFields([
      ...fields,
      {
        id: `field_${Date.now()}`,
        label: '',
        type: 'text',
        required: false
      }
    ]);
  };

  const removeField = (index: number) => {
    setFields(fields.filter((_, i) => i !== index));
  };

  const updateField = (index: number, updates: Partial<FormField>) => {
    setFields(fields.map((field, i) => 
      i === index ? { ...field, ...updates } : field
    ));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    try {
      const { error: updateError } = await supabase
        .from('questions')
        .update({
          form_fields: fields,
          answer_template: template,
          has_form: true
        })
        .eq('id', questionId);

      if (updateError) throw updateError;

      onUpdate();
      onClose();
    } catch (err) {
      console.error('Error updating form settings:', err);
      setError('Failed to update form settings');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Настройка формы</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-medium text-gray-900">Поля формы</h4>
                <button
                  type="button"
                  onClick={addField}
                  className="inline-flex items-center px-3 py-1 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Добавить поле
                </button>
              </div>
              
              <div className="space-y-4">
                {fields.map((field, index) => (
                  <div key={field.id} className="flex gap-4 items-start p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1">
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Название поля
                        </label>
                        <input
                          type="text"
                          value={field.label}
                          onChange={(e) => updateField(index, { label: e.target.value })}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        />
                      </div>
                      <div className="mb-2">
                        <label className="block text-sm font-medium text-gray-700">
                          Тип поля
                        </label>
                        <select
                          value={field.type}
                          onChange={(e) => updateField(index, { type: e.target.value as FormField['type'] })}
                          className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                        >
                          <option value="text">Текст</option>
                          <option value="number">Число</option>
                          <option value="date">Дата</option>
                          <option value="select">Выбор из списка</option>
                        </select>
                      </div>
                      {field.type === 'select' && (
                        <div className="mb-2">
                          <label className="block text-sm font-medium text-gray-700">
                            Варианты (через запятую)
                          </label>
                          <input
                            type="text"
                            value={field.options?.join(', ') || ''}
                            onChange={(e) => updateField(index, { 
                              options: e.target.value.split(',').map(s => s.trim()).filter(Boolean)
                            })}
                            className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md"
                          />
                        </div>
                      )}
                      <div className="flex items-center mt-2">
                        <input
                          type="checkbox"
                          id={`required-${field.id}`}
                          checked={field.required}
                          onChange={(e) => updateField(index, { required: e.target.checked })}
                          className="h-4 w-4 text-indigo-600 border-gray-300 rounded"
                        />
                        <label htmlFor={`required-${field.id}`} className="ml-2 text-sm text-gray-700">
                          Обязательное поле
                        </label>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeField(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Шаблон ответа
              </label>
              <p className="text-sm text-gray-500 mb-2">
                Используйте {'{fieldId}'} для вставки значений полей. Например: Здравствуйте, {'{name}'}!
              </p>
              <textarea
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                placeholder="Введите шаблон ответа..."
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Отмена
              </button>
              <button
                type="submit"
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}