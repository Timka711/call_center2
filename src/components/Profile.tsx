import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';
import { Save, Star, Clock, Palette, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { ShiftExchange } from './ShiftExchange';
import { WaveBackground } from './WaveBackground';
import { CallCenterLoader } from './CallCenterLoader';

interface DaySchedule {
  date: string;
  start: string;
  end: string;
}

interface Profile {
  first_name: string | null;
  last_name: string | null;
  chat_rating: number;
  work_schedule: DaySchedule[];
  color_scheme: string;
}

const COLOR_SCHEMES = [
  { 
    id: 'light', 
    name: 'Светлая', 
    bg: 'bg-white', 
    text: 'text-gray-900',
    preview: 'bg-gradient-to-br from-white to-gray-100 border border-gray-200'
  },
  { 
    id: 'dark', 
    name: 'Темная', 
    bg: 'bg-gray-900', 
    text: 'text-white',
    preview: 'bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700'
  },
  { 
    id: 'blue', 
    name: 'Синяя', 
    bg: 'bg-blue-100', 
    text: 'text-blue-900',
    preview: 'bg-gradient-to-br from-blue-100 to-blue-200 border border-blue-200'
  },
  { 
    id: 'green', 
    name: 'Зеленая', 
    bg: 'bg-green-100', 
    text: 'text-green-900',
    preview: 'bg-gradient-to-br from-green-100 to-green-200 border border-green-200'
  },
];

export function Profile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<Profile>({
    first_name: '',
    last_name: '',
    chat_rating: 0,
    work_schedule: [],
    color_scheme: 'light',
  });
  const [activeTab, setActiveTab] = useState('personal');
  const [error, setError] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    getProfile();
  }, []);

  useEffect(() => {
    // Apply color scheme to root element
    document.documentElement.className = profile.color_scheme;
  }, [profile.color_scheme]);

  async function getProfile() {
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUser(user);
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {
            // Profile doesn't exist, create it
            const { data: newProfile, error: insertError } = await supabase
              .from('profiles')
              .insert([
                {
                  id: user.id,
                  first_name: '',
                  last_name: '',
                  chat_rating: 0,
                  color_scheme: 'light',
                  work_schedule: [],
                  is_admin: false
                }
              ])
              .select()
              .single();

            if (insertError) throw insertError;
            setProfile(newProfile);
          } else {
            throw error;
          }
        } else {
          setProfile(data);
          setIsAdmin(data.is_admin || false);
        }
      }
    } catch (error) {
      console.error('Error loading profile:', error);
      setError('Error loading profile');
    } finally {
      setLoading(false);
    }
  }

  async function updateProfile() {
    try {
      setError(null);
      if (!user) return;

      const { error } = await supabase
        .from('profiles')
        .update({
          first_name: profile.first_name,
          last_name: profile.last_name,
          chat_rating: profile.chat_rating,
          color_scheme: profile.color_scheme,
          updated_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Error updating profile');
    }
  }

  const handlePrevMonth = () => {
    setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() - 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(prevDate => new Date(prevDate.getFullYear(), prevDate.getMonth() + 1));
  };

  const getDaysInMonth = () => {
    const start = startOfMonth(currentDate);
    const end = endOfMonth(currentDate);
    return eachDayOfInterval({ start, end });
  };

  const isWorkDay = (date: Date) => {
    const schedule = profile.work_schedule?.find(s => 
      s.date === format(date, 'yyyy-MM-dd') && (s.start || s.end)
    );
    return !!schedule;
  };

  const getScheduleForDay = (date: Date): DaySchedule | undefined => {
    return profile.work_schedule?.find(s => s.date === format(date, 'yyyy-MM-dd'));
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

  return (
    <>
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-md">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('personal')}
                className={`py-4 px-6 border-b-2 text-sm font-medium ${
                  activeTab === 'personal'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Личные данные
              </button>
              <button
                onClick={() => setActiveTab('quality')}
                className={`py-4 px-6 border-b-2 text-sm font-medium ${
                  activeTab === 'quality'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Star className="w-4 h-4 inline mr-2" />
                Качество чатов
              </button>
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-4 px-6 border-b-2 text-sm font-medium ${
                  activeTab === 'schedule'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                График работы
              </button>
              <button
                onClick={() => setActiveTab('shifts')}
                className={`py-4 px-6 border-b-2 text-sm font-medium ${
                  activeTab === 'shifts'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Обмен сменами
              </button>
              <button
                onClick={() => setActiveTab('theme')}
                className={`py-4 px-6 border-b-2 text-sm font-medium ${
                  activeTab === 'theme'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Palette className="w-4 h-4 inline mr-2" />
                Оформление
              </button>
            </nav>
          </div>

          <div className="p-6">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
                {error}
              </div>
            )}

            {activeTab === 'personal' && (
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <p className="text-gray-900">{user?.email}</p>
                </div>

                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">
                    Имя
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    value={profile.first_name || ''}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">
                    Фамилия
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    value={profile.last_name || ''}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
            )}

            {activeTab === 'quality' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Оценка качества чатов</h3>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      onClick={() => setProfile({ ...profile, chat_rating: rating })}
                      className={`p-2 rounded-full ${
                        rating <= profile.chat_rating
                          ? 'text-yellow-400 hover:text-yellow-500'
                          : 'text-gray-300 hover:text-gray-400'
                      }`}
                    >
                      <Star className="w-8 h-8 fill-current" />
                    </button>
                  ))}
                </div>
                <p className="text-sm text-gray-500">
                  Текущая оценка: {profile.chat_rating} из 5
                </p>
              </div>
            )}

            {activeTab === 'schedule' && (
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <button
                      onClick={handlePrevMonth}
                      className="p-2 text-gray-600 hover:text-indigo-600"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h3 className="text-lg font-medium">
                      {format(currentDate, 'LLLL yyyy', { locale: ru })}
                    </h3>
                    <button
                      onClick={handleNextMonth}
                      className="p-2 text-gray-600 hover:text-indigo-600"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-7 gap-1 mb-2">
                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map((day) => (
                      <div key={day} className="text-center text-sm font-medium text-gray-500 py-2">
                        {day}
                      </div>
                    ))}
                  </div>

                  <div className="grid grid-cols-7 gap-1">
                    {getDaysInMonth().map((date, index) => {
                      const isWorkingDay = isWorkDay(date);
                      const schedule = getScheduleForDay(date);
                      
                      return (
                        <div
                          key={index}
                          className={`
                            relative p-2 min-h-[80px] border rounded-lg
                            ${!isSameMonth(date, currentDate) ? 'bg-gray-50 text-gray-400' : ''}
                            ${isWorkingDay ? 'bg-green-50' : ''}
                            ${isToday(date) ? 'border-indigo-500' : 'border-gray-200'}
                          `}
                        >
                          <span className="text-sm">{format(date, 'd')}</span>
                          {isWorkingDay && schedule && (
                            <div className="mt-1">
                              <div className="text-xs text-gray-600">
                                <Clock className="w-3 h-3 inline mr-1" />
                                {schedule.start} - {schedule.end}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'shifts' && user && (
              <ShiftExchange currentUserId={user.id} isAdmin={isAdmin} />
            )}

            {activeTab === 'theme' && (
              <div className="space-y-4">
                <h3 className="text-lg font-medium text-gray-900">Цветовая схема</h3>
                <div className="grid grid-cols-2 gap-4">
                  {COLOR_SCHEMES.map((scheme) => (
                    <button
                      key={scheme.id}
                      onClick={() => setProfile({ ...profile, color_scheme: scheme.id })}
                      className={`p-4 rounded-lg ${scheme.preview} transition-all duration-200 ${
                        profile.color_scheme === scheme.id
                          ? 'ring-2 ring-indigo-500 ring-offset-2'
                          : 'hover:scale-105'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${scheme.text}`}>{scheme.name}</span>
                        {profile.color_scheme === scheme.id && (
                          <div className="w-4 h-4 rounded-full bg-indigo-500" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-end">
              <button
                onClick={updateProfile}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                <Save className="w-4 h-4 mr-2" />
                Сохранить изменения
              </button>
            </div>
          </div>
        </div>
      </div>
      <WaveBackground />
    </>
  );
}