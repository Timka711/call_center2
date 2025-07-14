import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { format, parseISO } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Clock, User, Calendar, MessageSquare, Check, X, AlertCircle } from 'lucide-react';

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

interface ShiftExchangeRequest {
  id: string;
  requester_id: string;
  target_user_id: string;
  requester_date: string;
  target_date: string;
  requester_shift: DaySchedule;
  target_shift: DaySchedule;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  message: string | null;
  admin_notified: boolean;
  user_approved: boolean;
  admin_approved: boolean;
  created_at: string;
  updated_at: string;
  requester_profile?: Profile;
  target_profile?: Profile;
}

interface ShiftExchangeProps {
  currentUserId: string;
  isAdmin: boolean;
}

export function ShiftExchange({ currentUserId, isAdmin }: ShiftExchangeProps) {
  const [requests, setRequests] = useState<ShiftExchangeRequest[]>([]);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newRequest, setNewRequest] = useState({
    target_user_id: '',
    requester_date: '',
    target_date: '',
    message: ''
  });

  useEffect(() => {
    fetchData();
  }, [currentUserId, isAdmin]);

  async function fetchData() {
    try {
      setLoading(true);
      setError(null);

      // Fetch all profiles first for the dropdown
      const { data: allProfilesData, error: allProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, work_schedule')
        .neq('id', currentUserId);

      if (allProfilesError) throw allProfilesError;

      setProfiles(allProfilesData || []);

      // Fetch exchange requests first
      let query = supabase
        .from('shift_exchange_requests')
        .select('*')
        .order('created_at', { ascending: false });

      // Filter requests based on admin status and context
      if (!isAdmin) {
        // Non-admin users can only see their own exchanges
        query = query.or(`requester_id.eq.${currentUserId},target_user_id.eq.${currentUserId}`);
      }
      // Admin users see all exchanges (no additional filter needed)

      const { data: requestsData, error: requestsError } = await query;

      if (requestsError) throw requestsError;

      // Get all unique user IDs from requests
      const userIds = new Set<string>();
      requestsData?.forEach(request => {
        userIds.add(request.requester_id);
        userIds.add(request.target_user_id);
      });

      // Fetch profiles for all users involved in requests
      const { data: involvedProfilesData, error: involvedProfilesError } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, work_schedule')
        .in('id', Array.from(userIds));

      if (involvedProfilesError) throw involvedProfilesError;

      // Create a map for quick profile lookup
      const profileMap = new Map();
      involvedProfilesData?.forEach(profile => {
        profileMap.set(profile.id, profile);
      });

      // Attach profile data to requests
      const requestsWithProfiles = requestsData?.map(request => ({
        ...request,
        requester_profile: profileMap.get(request.requester_id),
        target_profile: profileMap.get(request.target_user_id)
      })) || [];

      setRequests(requestsWithProfiles);
    } catch (err) {
      console.error('Error fetching data:', err);
      setError('Failed to load shift exchange data');
    } finally {
      setLoading(false);
    }
  }

  async function createExchangeRequest() {
    try {
      setError(null);

      if (!newRequest.target_user_id || !newRequest.requester_date || !newRequest.target_date) {
        setError('Please fill in all required fields');
        return;
      }

      // Get current user's schedule for the requested date
      const { data: currentUserProfile, error: profileError } = await supabase
        .from('profiles')
        .select('work_schedule')
        .eq('id', currentUserId)
        .single();

      if (profileError) throw profileError;

      const requesterSchedule = currentUserProfile.work_schedule?.find(
        (s: DaySchedule) => s.date === newRequest.requester_date
      );

      if (!requesterSchedule) {
        setError('You don\'t have a shift scheduled for the selected date');
        return;
      }

      // Get target user's schedule for the target date
      const targetProfile = profiles.find(p => p.id === newRequest.target_user_id);
      const targetSchedule = targetProfile?.work_schedule?.find(
        (s: DaySchedule) => s.date === newRequest.target_date
      );

      if (!targetSchedule) {
        setError('Target user doesn\'t have a shift scheduled for the selected date');
        return;
      }

      const { error: insertError } = await supabase
        .from('shift_exchange_requests')
        .insert([
          {
            requester_id: currentUserId,
            target_user_id: newRequest.target_user_id,
            requester_date: newRequest.requester_date,
            target_date: newRequest.target_date,
            requester_shift: requesterSchedule,
            target_shift: targetSchedule,
            message: newRequest.message || null,
            status: 'pending'
          }
        ]);

      if (insertError) throw insertError;

      setNewRequest({
        target_user_id: '',
        requester_date: '',
        target_date: '',
        message: ''
      });
      setShowCreateForm(false);
      fetchData();
    } catch (err) {
      console.error('Error creating exchange request:', err);
      setError('Failed to create exchange request');
    }
  }

  async function updateRequestStatus(requestId: string, status: 'approved' | 'rejected' | 'cancelled') {
    try {
      setError(null);
      
      const request = requests.find(r => r.id === requestId);
      if (!request) return;

      let updateData: any = {};

      if (status === 'approved') {
        // Determine who is approving
        const isTargetUser = request.target_user_id === currentUserId;
        const isAdminUser = isAdmin;

        if (isTargetUser) {
          updateData.user_approved = true;
        }
        
        if (isAdminUser) {
          updateData.admin_approved = true;
        }

        // Check if both approvals are now complete
        const userApproved = isTargetUser ? true : request.user_approved;
        const adminApproved = isAdminUser ? true : request.admin_approved;

        if (userApproved && adminApproved) {
          updateData.status = 'approved';
          // Swap shifts when both have approved
          await swapShifts(request);
        } else {
          updateData.status = 'pending'; // Keep as pending until both approve
        }
      } else {
        // For rejected or cancelled, reset approvals and set status
        updateData = {
          status,
          user_approved: false,
          admin_approved: false
        };
      }

      const { error: updateError } = await supabase
        .from('shift_exchange_requests')
        .update(updateData)
        .eq('id', requestId);

      if (updateError) throw updateError;

      fetchData();
    } catch (err) {
      console.error('Error updating request status:', err);
      setError('Failed to update request status');
    }
  }

  async function swapShifts(request: ShiftExchangeRequest) {
    try {
      // Get current schedules
      const { data: requesterProfile, error: requesterError } = await supabase
        .from('profiles')
        .select('work_schedule')
        .eq('id', request.requester_id)
        .single();

      const { data: targetProfile, error: targetError } = await supabase
        .from('profiles')
        .select('work_schedule')
        .eq('id', request.target_user_id)
        .single();

      if (requesterError || targetError) throw requesterError || targetError;

      // Update requester's schedule
      const updatedRequesterSchedule = requesterProfile.work_schedule.map((s: DaySchedule) =>
        s.date === request.requester_date ? request.target_shift : s
      );

      // Update target user's schedule
      const updatedTargetSchedule = targetProfile.work_schedule.map((s: DaySchedule) =>
        s.date === request.target_date ? request.requester_shift : s
      );

      // Apply updates
      const { error: requesterUpdateError } = await supabase
        .from('profiles')
        .update({ work_schedule: updatedRequesterSchedule })
        .eq('id', request.requester_id);

      const { error: targetUpdateError } = await supabase
        .from('profiles')
        .update({ work_schedule: updatedTargetSchedule })
        .eq('id', request.target_user_id);

      if (requesterUpdateError || targetUpdateError) {
        throw requesterUpdateError || targetUpdateError;
      }
    } catch (err) {
      console.error('Error swapping shifts:', err);
      throw err;
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'rejected': return 'text-red-600 bg-red-50 border-red-200';
      case 'cancelled': return 'text-gray-600 bg-gray-50 border-gray-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'Ожидает';
      case 'approved': return 'Одобрено';
      case 'rejected': return 'Отклонено';
      case 'cancelled': return 'Отменено';
      default: return status;
    }
  };

  const getApprovalStatus = (request: ShiftExchangeRequest) => {
    if (request.status === 'approved') {
      return 'Полностью одобрено';
    }
    
    const approvals = [];
    if (request.user_approved) {
      approvals.push('Пользователь');
    }
    if (request.admin_approved) {
      approvals.push('Администратор');
    }
    
    if (approvals.length === 0) {
      return 'Ожидает одобрения';
    }
    
    return `Одобрено: ${approvals.join(', ')}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Обмен сменами</h3>
        {!isAdmin && (
          <button
            onClick={() => setShowCreateForm(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
          >
            Запросить обмен
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg flex items-start">
          <AlertCircle className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {showCreateForm && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h4 className="text-md font-medium text-gray-900 mb-4">Создать запрос на обмен сменами</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Пользователь для обмена
              </label>
              <select
                value={newRequest.target_user_id}
                onChange={(e) => setNewRequest(prev => ({ ...prev, target_user_id: e.target.value }))}
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

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Ваша дата (отдаете)
              </label>
              <input
                type="date"
                value={newRequest.requester_date}
                onChange={(e) => setNewRequest(prev => ({ ...prev, requester_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Желаемая дата (получаете)
              </label>
              <input
                type="date"
                value={newRequest.target_date}
                onChange={(e) => setNewRequest(prev => ({ ...prev, target_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Сообщение (необязательно)
              </label>
              <textarea
                value={newRequest.message}
                onChange={(e) => setNewRequest(prev => ({ ...prev, message: e.target.value }))}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Причина обмена..."
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <button
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Отмена
            </button>
            <button
              onClick={createExchangeRequest}
              className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
            >
              Создать запрос
            </button>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {requests.length === 0 ? (
          <p className="text-center text-gray-500 py-8">Нет запросов на обмен сменами</p>
        ) : (
          requests.map((request) => (
            <div key={request.id} className="bg-white border border-gray-200 rounded-lg p-6">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">
                    {request.requester_profile?.first_name} {request.requester_profile?.last_name}
                  </span>
                  <span className="text-gray-500">→</span>
                  <span className="font-medium">
                    {request.target_profile?.first_name} {request.target_profile?.last_name}
                  </span>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm border ${getStatusColor(request.status)}`}>
                  {getStatusText(request.status)}
                </span>
                {request.status === 'pending' && (
                  <div className="text-xs text-gray-500 mt-1">
                    {getApprovalStatus(request)}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-red-600" />
                    <span className="text-sm font-medium text-red-800">Отдает</span>
                  </div>
                  <p className="text-sm text-red-700">
                    {format(parseISO(request.requester_date), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-red-600" />
                    <span className="text-xs text-red-600">
                      {request.requester_shift.start} - {request.requester_shift.end}
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Calendar className="w-4 h-4 text-green-600" />
                    <span className="text-sm font-medium text-green-800">Получает</span>
                  </div>
                  <p className="text-sm text-green-700">
                    {format(parseISO(request.target_date), 'dd MMMM yyyy', { locale: ru })}
                  </p>
                  <div className="flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3 text-green-600" />
                    <span className="text-xs text-green-600">
                      {request.target_shift.start} - {request.target_shift.end}
                    </span>
                  </div>
                </div>
              </div>

              {request.message && (
                <div className="mb-4 p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <MessageSquare className="w-4 h-4 text-gray-600" />
                    <span className="text-sm font-medium text-gray-700">Сообщение</span>
                  </div>
                  <p className="text-sm text-gray-600">{request.message}</p>
                </div>
              )}

              <div className="flex justify-between items-center">
                <span className="text-xs text-gray-500">
                  Создано: {format(parseISO(request.created_at), 'dd.MM.yyyy HH:mm', { locale: ru })}
                </span>

                {request.status === 'pending' && (
                  <div className="flex gap-2">
                    {request.target_user_id === currentUserId && !request.user_approved && (
                      <>
                        <button
                          onClick={() => updateRequestStatus(request.id, 'approved')}
                          className="inline-flex items-center px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          <Check className="w-4 h-4 mr-1" />
                          Одобрить (Пользователь)
                        </button>
                        <button
                          onClick={() => updateRequestStatus(request.id, 'rejected')}
                          className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                        >
                          <X className="w-4 h-4 mr-1" />
                          Отклонить
                        </button>
                      </>
                    )}
                    {isAdmin && !request.admin_approved && (
                      <button
                        onClick={() => updateRequestStatus(request.id, 'approved')}
                        className="inline-flex items-center px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                      >
                        <Check className="w-4 h-4 mr-1" />
                        Одобрить (Администратор)
                      </button>
                    )}
                    {request.requester_id === currentUserId && (
                      <button
                        onClick={() => updateRequestStatus(request.id, 'cancelled')}
                        className="inline-flex items-center px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Отменить
                      </button>
                    )}
                    {isAdmin && (
                      <button
                        onClick={() => updateRequestStatus(request.id, 'rejected')}
                        className="inline-flex items-center px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                      >
                        <X className="w-4 h-4 mr-1" />
                        Отклонить (Администратор)
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}