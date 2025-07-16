import React, { useEffect, useState } from 'react';
import { Auth } from './components/Auth';
import { QuestionTree } from './components/QuestionTree';
import { Profile } from './components/Profile';
import { AdminPanel } from './components/AdminPanel';
import { supabase } from './lib/supabase';
import { LogOut, User, Shield } from 'lucide-react';

function App() {
  const [session, setSession] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    supabase.auth.getSession()
      .then(({ data: { session } }) => {
        setSession(session);
        if (session?.user) {
          checkAdminStatus(session.user.id);
        }
      })
      .catch((error) => {
        console.error('Session retrieval error:', error);
        if (error.message && error.message.includes('Refresh Token Not Found')) {
          supabase.auth.signOut();
        }
      });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        checkAdminStatus(session.user.id);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminStatus = async (userId: string | undefined) => {
    if (!userId) return;

    try {
      // First, ensure the profile exists
      const { data: existingProfile, error: profileError } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();

      if (profileError) {
        if (profileError.code === 'PGRST116') {
          // Profile doesn't exist, create it
          const { error: insertError } = await supabase
            .from('profiles')
            .insert([
              {
                id: userId,
                is_admin: false,
                chat_rating: 0,
                color_scheme: 'light',
                work_schedule: []
              }
            ]);

          if (insertError) throw insertError;
          setIsAdmin(false);
        } else {
          throw profileError;
        }
      } else {
        setIsAdmin(existingProfile?.is_admin || false);
      }
    } catch (error) {
      console.error('Error checking admin status:', error);
      setIsAdmin(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-gray-900">Вопросы для вопросов</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => {
                  setShowProfile(false);
                  setShowAdmin(false);
                }}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                  !showProfile && !showAdmin
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                    : 'text-gray-700 hover:text-indigo-600'
                }`}
              >
                Вопросы
              </button>
              <button
                onClick={() => {
                  setShowProfile(true);
                  setShowAdmin(false);
                }}
                className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                  showProfile
                    ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                    : 'text-gray-700 hover:text-indigo-600'
                }`}
              >
                <User className="w-4 h-4 mr-2" />
                Профиль
              </button>
              {isAdmin && (
                <button
                  onClick={() => {
                    setShowAdmin(true);
                    setShowProfile(false);
                  }}
                  className={`inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md ${
                    showAdmin
                      ? 'text-white bg-indigo-600 hover:bg-indigo-700'
                      : 'text-gray-700 hover:text-indigo-600'
                  }`}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Админ
                </button>
              )}
              <button
                onClick={handleSignOut}
                className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Выйти
              </button>
            </div>
          </div>
        </div>
      </nav>
      <main>
        {showAdmin && isAdmin ? (
          <AdminPanel />
        ) : showProfile ? (
          <Profile />
        ) : (
          <QuestionTree />
        )}
      </main>
    </div>
  );
}

export default App;