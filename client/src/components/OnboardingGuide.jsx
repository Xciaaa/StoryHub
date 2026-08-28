import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import Avatar from '../components/Avatar';

const STORAGE_KEY = 'onboarding_dismissed_v1';

const GOAL_META = {
  create_first_project: { label: 'Create your first project', description: 'Start by creating a new project from the dashboard.', icon: 'folder_open' },
  add_first_node: { label: 'Add your first node', description: 'Open the editor and add a character, location, or event.', icon: 'add_circle' },
  connect_nodes: { label: 'Connect two nodes', description: 'Draw an edge between nodes to build relationships.', icon: 'timeline' },
  follow_architect: { label: 'Follow another architect', description: 'Explore the community and follow someone inspiring.', icon: 'person_add' },
  complete_challenge: { label: 'Complete a writing prompt', description: 'Accept a challenge and turn it into a project.', icon: 'auto_awesome' },
  share_project: { label: 'Share your first universe', description: 'Set a project public so others can discover it.', icon: 'public' },
};

const DEFAULT_GOALS = Object.keys(GOAL_META).map((key) => ({
  key,
  ...GOAL_META[key],
  completed: false,
  completed_at: null,
}));

export default function OnboardingGuide() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(STORAGE_KEY) === 'true';
    }
    return false;
  });

  const refreshGoals = async () => {
    console.log('Onboarding: refreshGoals called', { user: !!user, dismissed });
    if (!user || dismissed) return;
    try {
      const data = await api.listGoals();
      console.log('Onboarding: API response', data);
      if (Array.isArray(data) && data.length > 0) {
        setGoals(data);
        setError('');
      } else {
        console.log('Onboarding: falling back to DEFAULT_GOALS');
        setGoals(DEFAULT_GOALS);
        setError('');
      }
    } catch (err) {
      console.error('Onboarding: failed to load goals', err);
      setError(err.message || 'Failed to load goals');
      setGoals(DEFAULT_GOALS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refreshGoals();
  }, [user, dismissed]);

  useEffect(() => {
    if (!user || dismissed) return;
    const interval = setInterval(() => {
      api.checkGoals().then((res) => {
        console.log('Onboarding: checkGoals result', res);
        if (res?.goals && Array.isArray(res.goals)) {
          setGoals(res.goals);
        }
      }).catch((err) => {
        console.error('Onboarding: checkGoals failed', err);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [user, dismissed]);

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem(STORAGE_KEY, 'true');
  };

  const handleReset = () => {
    localStorage.removeItem(STORAGE_KEY);
    setDismissed(false);
    refreshGoals();
  };

  console.log('Onboarding: render', { user: !!user, dismissed, loading, goalsCount: goals.length, error });

  if (!user) {
    console.log('Onboarding: hiding because no user');
    return null;
  }

  if (dismissed) {
    console.log('Onboarding: hiding because dismissed');
    return null;
  }

  const incomplete = goals.filter((g) => !g.completed);
  console.log('Onboarding: incomplete goals', incomplete.length, incomplete);

  if (incomplete.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 w-full max-w-sm">
      <div className="glass-strong rounded-xl border border-outline-variant/30 shadow-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">emoji_events</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">Getting Started</h3>
          </div>
          <button onClick={handleDismiss} className="text-on-surface-variant hover:text-on-surface transition-colors">
            <span className="material-symbols-outlined text-sm">close</span>
          </button>
        </div>
        <p className="font-body-sm text-body-sm text-on-surface-variant">
          Complete these goals to learn the basics of Lore Canvas.
        </p>
        {error && (
          <p className="text-xs text-red-400">Using offline goals ({error})</p>
        )}
        <div className="flex flex-col gap-2">
          {incomplete.map((goal) => {
            const meta = GOAL_META[goal.key] || { label: goal.key, description: '', icon: 'checklist' };
            return (
              <div key={goal.key} className="flex items-start gap-3 p-3 rounded-lg bg-surface-container/40 border border-outline-variant/20">
                <div className="w-8 h-8 rounded-full bg-primary-container/20 text-primary-container border border-primary-container/30 flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[16px]">{meta.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-label-md text-label-md text-on-surface">{meta.label}</div>
                  <div className="font-body-sm text-body-sm text-on-surface-variant">{meta.description}</div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between text-xs text-on-surface-variant">
          <span>{goals.filter((g) => g.completed).length}/{goals.length} completed</span>
          <button onClick={handleReset} className="hover:text-on-surface transition-colors">
            Reset guide
          </button>
        </div>
      </div>
    </div>
  );
}
