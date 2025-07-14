import React, { useState } from 'react';
import { Upload, X, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ImageUploadProps {
  onUpload: (url: string) => void;
  onCancel: () => void;
  currentImage?: string | null;
}

export function ImageUpload({ onUpload, onCancel, currentImage }: ImageUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setError(null);
      setUploading(true);

      const file = event.target.files?.[0];
      if (!file) return;

      // Validate file type
      if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        throw new Error('Пожалуйста, выберите изображение в формате JPEG, PNG или WebP');
      }

      // Validate file size (2MB)
      if (file.size > 2 * 1024 * 1024) {
        throw new Error('Размер файла не должен превышать 2MB');
      }

      // Generate a unique filename
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;

      // Upload to Supabase Storage
      const { data, error: uploadError } = await supabase.storage
        .from('question-images')
        .upload(fileName, file);

      if (uploadError) {
        // Handle specific bucket not found error
        if (uploadError.message?.includes('Bucket not found')) {
          throw new Error('Хранилище изображений не настроено. Обратитесь к администратору для создания bucket "question-images" в Supabase Storage.');
        }
        throw uploadError;
      }

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('question-images')
        .getPublicUrl(data.path);

      onUpload(publicUrl);
    } catch (err) {
      console.error('Error uploading image:', err);
      setError(err instanceof Error ? err.message : 'Ошибка загрузки изображения');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = async () => {
    if (!currentImage) return;

    try {
      setError(null);
      
      // Extract filename from URL
      const fileName = currentImage.split('/').pop();
      if (!fileName) return;

      // Delete from storage
      const { error: deleteError } = await supabase.storage
        .from('question-images')
        .remove([fileName]);

      if (deleteError) {
        // Handle specific bucket not found error
        if (deleteError.message?.includes('Bucket not found')) {
          throw new Error('Хранилище изображений не настроено. Обратитесь к администратору для создания bucket "question-images" в Supabase Storage.');
        }
        throw deleteError;
      }

      onUpload('');
    } catch (err) {
      console.error('Error removing image:', err);
      setError(err instanceof Error ? err.message : 'Ошибка удаления изображения');
    }
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg relative">
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm flex items-start">
          <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex flex-col gap-4">
        {currentImage ? (
          <div>
            <img
              src={currentImage}
              alt="Current"
              className="w-full h-48 object-cover rounded-lg mb-2"
            />
            <button
              onClick={handleRemoveImage}
              className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={uploading}
            >
              <X className="w-4 h-4 mr-2" />
              Удалить изображение
            </button>
          </div>
        ) : (
          <label className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-lg cursor-pointer hover:border-indigo-500 transition-colors ${uploading ? 'opacity-50 cursor-not-allowed' : ''}`}>
            <div className="flex flex-col items-center justify-center pt-5 pb-6">
              <Upload className="w-8 h-8 text-gray-400 mb-2" />
              <p className="mb-2 text-sm text-gray-500">
                <span className="font-semibold">Нажмите для загрузки</span> или перетащите файл
              </p>
              <p className="text-xs text-gray-500">JPEG, PNG или WebP (макс. 2MB)</p>
            </div>
            <input
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </label>
        )}

        <div className="flex justify-end">
          <button
            onClick={onCancel}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={uploading}
          >
            Отмена
          </button>
        </div>
      </div>

      {uploading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center rounded-lg">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      )}
    </div>
  );
}