import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isToday } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Clock, ChevronLeft, ChevronRight } from 'lucide-react';
import { WaveBackground } from './WaveBackground';
import { CallCenterLoader } from './CallCenterLoader';
import { ShiftExchange } from './ShiftExchange';

interface Profile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  work_schedule: DaySchedule[];
}

interface DaySchedule {
  date: string;
  start: string;
  end: string;
}

export function AdminPanel() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [scheduleTime, setScheduleTime] = useState({ start: '', end: '' });
  const [selectedDates, setSelectedDates] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [activeTab, setActiveTab] = useState('schedule');
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchProfiles();
  }, []);

async function fetchProfiles() {
  try {
    setLoading(true);
    setError(null);

    // 1. Проверка аутентификации
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    console.log("Auth user:", authUser);
    
    if (authError || !authUser) {
      setError('Not authenticated: ' + (authError?.message || 'No user'));
      return;
    }
    
    setCurrentUserId(authUser.id);

    // 2. Проверка прав администратора
    const { data: adminProfile, error: adminError } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('id', authUser.id)
      .single();

    console.log("Admin check:", adminProfile, adminError);
    
    if (adminError) {
      if (adminError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        const { error: insertError } = await supabase
          .from('profiles')
          .insert([
            {
              id: authUser.id,
              is_admin: false,
              chat_rating: 0,
              color_scheme: 'light',
              work_schedule: []
            }
          ]);

        if (insertError) {
          setError('Failed to create profile: ' + insertError.message);
          return;
        }
        setError('Not authorized');
        return;
      } else {
        setError('Admin check failed: ' + adminError.message);
        return;
      }
    }
    
    if (!adminProfile?.is_admin) {
      setError('Not authorized');
      return;
    }

    // 3. Запрос всех профилей для администратора
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, first_name, last_name, work_schedule');

    console.log("Profiles data:", profilesData);
    console.log("Profiles error:", profilesError);
    
    if (profilesError) {
      setError('Profiles fetch failed: ' + profilesError.message);
      return;
    }

    const filteredProfiles = profilesData
      .filter(profile => profile.id !== authUser.id) // Исключаем текущего пользователя из списка
      .map(profile => {
        return {
          ...profile,
          work_schedule: profile.work_schedule || []
        };
      });

    console.log("Filtered profiles:", filteredProfiles);
    setProfiles(filteredProfiles);
  } catch (err) {
    console.error('Error fetching profiles:', err);
    setError(err instanceof Error ? err.message : 'Failed to load user profiles');
  } finally {
    setLoading(false);
  }
}
  async function updateSchedule(profileId: string, date: string, start: string, end: string) {
    try {
      setError(null);
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) return;

      const updatedSchedule = [...(profile.work_schedule || [])];
      const scheduleIndex = updatedSchedule.findIndex(s => s.date === date);

      if (scheduleIndex >= 0) {
        updatedSchedule[scheduleIndex] = { date, start, end };
      } else {
        updatedSchedule.push({ date, start, end });
      }

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ work_schedule: updatedSchedule })
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Update local state
      setProfiles(profiles.map(p =>
        p.id === profileId
          ? { ...p, work_schedule: updatedSchedule }
          : p
      ));

      setScheduleTime({ start: '', end: '' });
      setSelectedDates([]);
      setSelectedDate(null);
      setIsMultiSelectMode(false);
    } catch (err) {
      console.error('Error updating schedule:', err);
      setError('Failed to update schedule');
    }
  }

  async function updateMultipleSchedules(profileId: string, dates: string[], start: string, end: string) {
    try {
      setError(null);
      const profile = profiles.find(p => p.id === profileId);
      if (!profile) return;

      const updatedSchedule = [...(profile.work_schedule || [])];
      
      // Update or add schedule for each selected date
      dates.forEach(date => {
        const scheduleIndex = updatedSchedule.findIndex(s => s.date === date);
        if (scheduleIndex >= 0) {
          updatedSchedule[scheduleIndex] = { date, start, end };
        } else {
          updatedSchedule.push({ date, start, end });
        }
      });

      const { error: updateError } = await supabase
        .from('profiles')
        .update({ work_schedule: updatedSchedule })
        .eq('id', profileId);

      if (updateError) throw updateError;

      // Update local state
      setProfiles(profiles.map(p =>
        p.id === profileId
          ? { ...p, work_schedule: updatedSchedule }
          : p
      ));

      setScheduleTime({ start: '', end: '' });
      setSelectedDates([]);
      setSelectedDate(null);
      setIsMultiSelectMode(false);
    } catch (err) {
      console.error('Error updating multiple schedules:', err);
      setError('Failed to update schedules');
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

  const isWorkDay = (date: Date, profileId: string) => {
    const profile = profiles.find(p => p.id === profileId);
    if (!profile) return false;

    const schedule = profile.work_schedule?.find(s => 
      s.date === format(date, 'yyyy-MM-dd') && (s.start || s.end)
    );
    return !!schedule;
  };

  const handleDateClick = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    
    if (isMultiSelectMode) {
      setSelectedDates(prev => {
        if (prev.includes(dateStr)) {
          return prev.filter(d => d !== dateStr);
        } else {
          return [...prev, dateStr];
        }
      });
    } else {
      setSelectedDate(dateStr);
      setSelectedDates([dateStr]);
    }
  };

  const toggleMultiSelectMode = () => {
    setIsMultiSelectMode(!isMultiSelectMode);
    setSelectedDates([]);
    setSelectedDate(null);
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

  if (error === 'Not authorized') {
    return (
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative">
          <strong className="font-bold">Access Denied!</strong>
          <span className="block sm:inline"> You don't have permission to access the admin panel.</span>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="max-w-7xl mx-auto p-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-2xl font-bold mb-6">Панель администратора</h2>

          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex">
              <button
                onClick={() => setActiveTab('schedule')}
                className={`py-4 px-6 border-b-2 text-sm font-medium ${
                  activeTab === 'schedule'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Управление графиком
              </button>
              <button
                onClick={() => setActiveTab('exchanges')}
                className={`py-4 px-6 border-b-2 text-sm font-medium ${
                  activeTab === 'exchanges'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Clock className="w-4 h-4 inline mr-2" />
                Обмен сменами
              </button>
            </nav>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          {activeTab === 'schedule' && (
            <>
              <div className="mb-6">
                <label htmlFor="userSelect" className="block text-sm font-medium text-gray-700 mb-2">
                  Выберите пользователя
                </label>
                <select
                  id="userSelect"
                  value={selectedProfile || ''}
                  onChange={(e) => setSelectedProfile(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="">Выберите пользователя...</option>
                  {profiles.map((profile) => (
                    <option key={profile.id} value={profile.id}>
                      {profile.first_name} {profile.last_name}
                    </option>
                  ))}
                </select>
              </div>

              {selectedProfile && (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <button
                        onClick={toggleMultiSelectMode}
                        className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                          isMultiSelectMode
                            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
                            : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                      >
                        {isMultiSelectMode ? 'Выйти из режима выбора' : 'Выбрать несколько дней'}
                      </button>
                      {isMultiSelectMode && selectedDates.length > 0 && (
                        <span className="text-sm text-gray-600">
                          Выбрано дней: {selectedDates.length}
                        </span>
                      )}
                    </div>
                  </div>
                  
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
                      const dateStr = format(date, 'yyyy-MM-dd');
                      const isSelected = selectedDate === dateStr || selectedDates.includes(dateStr);
                      const isWorkingDay = isWorkDay(date, selectedProfile);
                      
                      return (
                        <div
                          key={index}
                          className={`
                            relative p-2 min-h-[80px] border rounded-lg cursor-pointer transition-all duration-200
                            ${!isSameMonth(date, currentDate) ? 'bg-gray-50 text-gray-400' : 'hover:bg-indigo-50'}
                            ${isSelected ? 'bg-indigo-100 border-indigo-500 ring-2 ring-indigo-200' : 'border-gray-200'}
                            ${isWorkingDay ? 'bg-green-50' : ''}
                            ${isToday(date) ? 'border-indigo-500' : ''}
                            ${isMultiSelectMode && selectedDates.includes(dateStr) ? 'transform scale-95' : ''}
                          `}
                          onClick={() => handleDateClick(date)}
                        >
                          <span className="text-sm">{format(date, 'd')}</span>
                          {isMultiSelectMode && selectedDates.includes(dateStr) && (
                            <div className="absolute top-1 right-1 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                              <span className="text-white text-xs">✓</span>
                            </div>
                          )}
                          {isWorkingDay && (
                            <div className="absolute bottom-1 right-1">
                              <Clock className="w-4 h-4 text-green-600" />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {(selectedDate || selectedDates.length > 0) && (
                    <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                      <h4 className="text-lg font-medium mb-4">
                        {selectedDates.length > 1 
                          ? `Установить время работы на ${selectedDates.length} дней`
                          : `Установить время работы на ${format(new Date(selectedDate || selectedDates[0]), 'dd.MM.yyyy')}`
                        }
                      </h4>
                      
                      {selectedDates.length > 1 && (
                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-800 font-medium mb-2">Выбранные дни:</p>
                          <div className="flex flex-wrap gap-2">
                            {selectedDates.map(date => (
                              <span key={date} className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {format(new Date(date), 'dd.MM.yyyy')}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Начало
                          </label>
                          <input
                            type="time"
                            value={scheduleTime.start}
                            onChange={(e) => setScheduleTime(prev => ({ ...prev, start: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Конец
                          </label>
                          <input
                            type="time"
                            value={scheduleTime.end}
                            onChange={(e) => setScheduleTime(prev => ({ ...prev, end: e.target.value }))}
                            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        <button
                          onClick={() => {
                            if (selectedDates.length > 1) {
                              updateMultipleSchedules(selectedProfile, selectedDates, scheduleTime.start, scheduleTime.end);
                            } else {
                              updateSchedule(selectedProfile, selectedDate || selectedDates[0], scheduleTime.start, scheduleTime.end);
                            }
                          }}
                          className="mt-6 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
                        >
                          {selectedDates.length > 1 ? `Сохранить для ${selectedDates.length} дней` : 'Сохранить'}
                        </button>
                        
                        {selectedDates.length > 0 && (
                          <button
                            onClick={() => {
                              setSelectedDates([]);
                              setSelectedDate(null);
                              setIsMultiSelectMode(false);
                            }}
                            className="mt-6 px-4 py-2 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
                          >
                            Отмена
                          </button>
                        )}
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}

          {activeTab === 'exchanges' && currentUserId && (
            <ShiftExchange currentUserId={currentUserId} isAdmin={true} />
          )}
        </div>
      </div>
      <WaveBackground />
    </>
  );
}