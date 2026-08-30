import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, API_BASE } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import Avatar from '../components/Avatar';
import Logo from '../components/Logo';
import NotificationBell from '../components/NotificationBell';

const SECTIONS = [
  { id: 'account', label: 'Account', icon: 'person' },
  { id: 'appearance', label: 'Appearance', icon: 'palette' },
  { id: 'notifications', label: 'Notifications', icon: 'notifications' },
  { id: 'security', label: 'Security', icon: 'security' },
  { id: 'integrations', label: 'API & Integrations', icon: 'api' },
];

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { theme, toggleTheme, compact, toggleCompact, animations, toggleAnimations } = useTheme();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [activeSection, setActiveSection] = useState('account');
  const [form, setForm] = useState({
    username: '',
    email: '',
    avatar: '',
    bio: '',
    title: '',
    emailNotifications: true,
    pushNotifications: true,
  });
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [hasPassword, setHasPassword] = useState(true);
  const [recentProject, setRecentProject] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    loadProfile();
  }, []);

  async function loadProfile() {
    setLoading(true);
    setError('');
    try {
      const [profile, projects] = await Promise.all([
        api.getProfile(),
        api.listProjects().catch(() => []),
      ]);
      setForm({
        username: profile.username || '',
        email: profile.email || '',
        avatar: profile.avatar || '',
        bio: profile.bio || '',
        title: profile.title || '',
        emailNotifications: profile.email_notifications ?? true,
        pushNotifications: profile.push_notifications ?? true,
      });
      setHasPassword(!!profile.has_password);
      const sorted = Array.isArray(projects) ? projects.slice().sort((a, b) => new Date(b.updated_at || 0) - new Date(a.updated_at || 0)) : [];
      setRecentProject(sorted[0] || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const updated = await api.updateProfile(form);
      updateUser(updated);
      setSuccess('Profile updated successfully');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await api.changePassword(passwordForm.currentPassword, passwordForm.newPassword);
      setPasswordSuccess('Password updated successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleSetPassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword.length < 8) {
      setPasswordError('Password must be at least 8 characters');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('Passwords do not match');
      return;
    }

    setChangingPassword(true);
    try {
      await api.setPassword(passwordForm.newPassword);
      setPasswordSuccess('Password set successfully');
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setHasPassword(true);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setChangingPassword(false);
    }
  };

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try {
      const result = await api.uploadImage(formData);
      if (result?.url) {
        setForm((prev) => ({ ...prev, avatar: result.url }));
      }
    } catch (err) {
      console.error('Failed to upload avatar', err);
    }
  };

  const handleAvatarUrl = (e) => {
    const url = e.target.value.trim();
    if (url) {
      setForm((prev) => ({ ...prev, avatar: url }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-on-surface-variant flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="logo-continuous-loop">
            <Logo className="w-12 h-12" />
          </div>
          <p className="font-body-md text-body-md">Loading settings…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-on-surface">
      {/* Top Navigation */}
      <header className="fixed top-0 left-0 w-full z-50 flex justify-between items-center px-margin-desktop h-16 glass-strong border-b border-outline-variant/30">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden text-on-surface-variant hover:text-primary transition-colors p-2 -ml-2"
          >
            <span className="material-symbols-outlined">{mobileMenuOpen ? 'close' : 'menu'}</span>
          </button>
          <Link to="/dashboard" className="hidden md:block font-display-lg text-display-lg font-bold text-on-surface tracking-tight">
            LoreCanvas
          </Link>
          <Link to="/dashboard" className="md:hidden">
            <Logo className="w-8 h-8" />
          </Link>
          <nav className="hidden md:flex gap-6">
            <Link to="/dashboard" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">Dashboard</Link>
            {recentProject ? (
              <Link to={`/editor/${recentProject.id}`} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">Canvas</Link>
            ) : (
              <span className="text-on-surface-variant/50 font-label-md text-label-md cursor-not-allowed">Canvas</span>
            )}
            <Link to="/community" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md">Community</Link>
          </nav>
        </div>
        <div className="flex items-center gap-4">
          <NotificationBell />
          <Link to={`/profile/${user?.username}`} className="w-8 h-8 rounded-full overflow-hidden border border-outline-variant/30">
            <Avatar src={form.avatar || user?.avatar} alt="User profile" className="w-full h-full object-cover" />
          </Link>
        </div>
      </header>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-background/80 backdrop-blur-md" onClick={() => setMobileMenuOpen(false)} />
          <div className="absolute top-16 left-0 right-0 glass-strong border-b border-outline-variant/30 p-4 flex flex-col gap-2">
            <Link to="/dashboard" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md py-2" onClick={() => setMobileMenuOpen(false)}>Dashboard</Link>
            {recentProject ? (
              <Link to={`/editor/${recentProject.id}`} className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md py-2" onClick={() => setMobileMenuOpen(false)}>Canvas</Link>
            ) : (
              <span className="text-on-surface-variant/50 font-label-md text-label-md cursor-not-allowed py-2">Canvas</span>
            )}
            <Link to="/community" className="text-on-surface-variant font-medium hover:text-primary transition-colors duration-200 font-label-md text-label-md py-2" onClick={() => setMobileMenuOpen(false)}>Community</Link>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="pt-16 min-h-screen">
        <div className="max-w-[1200px] mx-auto flex flex-col md:flex-row gap-6 px-4 md:px-6">
          {/* Left Sidebar */}
          <aside className="w-full md:w-[280px] shrink-0">
            <h2 className="font-headline-md text-headline-md text-on-surface mb-4 md:hidden">Settings</h2>
            <nav className="flex flex-row md:flex-col gap-2 overflow-x-auto md:overflow-visible pb-4 md:pb-0 scrollbar-hide">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg font-label-md text-left whitespace-nowrap md:whitespace-normal transition-all ${
                    activeSection === section.id
                      ? 'text-on-primary-container bg-primary-container/20 glow-active'
                      : 'text-on-surface-variant hover:bg-surface-variant/40 hover:text-on-surface'
                  }`}
                >
                  <span className="material-symbols-outlined text-[20px]" style={{ fontVariationSettings: activeSection === section.id ? "'FILL' 1" : "'FILL' 0" }}>{section.icon}</span>
                  {section.label}
                </button>
              ))}
            </nav>
          </aside>

          {/* Right Content Area */}
          <section className="flex-grow flex flex-col gap-6">
            {activeSection === 'account' && (
              <form onSubmit={handleSubmit} className="glass-panel rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden">
                <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10 pointer-events-none" />
                <div className="flex flex-col gap-2">
                  <h2 className="font-headline-lg text-headline-lg text-on-surface">Account Profile</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Manage your identity across the Lore Canvas ecosystem.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-6 items-start">
                  <div className="flex flex-col gap-3 items-center sm:items-start shrink-0">
                    <div className="relative group cursor-pointer">
                      {form.avatar ? (
                        <img alt="Current avatar" className="w-28 h-28 rounded-full object-cover border-2 border-surface-variant group-hover:border-primary transition-colors" src={`${API_BASE}${form.avatar}`} />
                      ) : (
                        <div className="w-28 h-28 rounded-full bg-surface-container flex items-center justify-center border-2 border-surface-variant group-hover:border-primary transition-colors">
                          <span className="material-symbols-outlined text-[40px] text-outline">person</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-surface-container/60 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <span className="material-symbols-outlined text-on-surface">photo_camera</span>
                      </div>
                      <input type="file" accept="image/*" onChange={handleAvatarChange} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                    <div className="w-full max-w-[280px]">
                      <label className="font-label-sm text-label-sm text-on-surface-variant mb-1 block">Or paste avatar URL</label>
                      <input
                        type="url"
                        value={form.avatar}
                        onChange={(e) => setForm((prev) => ({ ...prev, avatar: e.target.value }))}
                        placeholder="https://example.com/avatar.jpg"
                        className="w-full px-3 py-2 rounded-lg bg-surface-container border border-outline-variant/30 text-on-surface text-sm focus:outline-none focus:border-primary-container focus:ring-1 focus:ring-primary-container transition-all"
                      />
                    </div>
                    <button type="button" onClick={() => document.querySelector('input[type=file]')?.click()} className="font-label-md text-label-md text-primary hover:text-inverse-primary transition-colors">
                      Change Avatar
                    </button>
                    {form.username && (
                      <Link to={`/profile/${encodeURIComponent(form.username)}`} className="font-label-sm text-label-sm text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 mt-1">
                        <span className="material-symbols-outlined text-[14px]">public</span>
                        View public profile
                      </Link>
                    )}
                  </div>
                  <div className="flex-grow flex flex-col gap-5 w-full">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Display Name</label>
                      <input
                        value={form.username}
                        onChange={(e) => setForm((prev) => ({ ...prev, username: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-lg text-body-lg"
                        placeholder="Enter your display name"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Title / Role</label>
                      <input
                        value={form.title}
                        onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-lg text-body-lg"
                        placeholder="e.g. World Builder, Storyteller, Architect"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Email Address</label>
                      <input
                        type="email"
                        value={form.email}
                        onChange={(e) => setForm((prev) => ({ ...prev, email: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-lg text-body-lg"
                        placeholder="Enter your email"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Bio / Creator Statement</label>
                      <textarea
                        value={form.bio}
                        onChange={(e) => setForm((prev) => ({ ...prev, bio: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-md text-body-md resize-none"
                        placeholder="A brief description of your worlds..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row justify-end pt-4 mt-2 border-t border-glass-border gap-3">
                  <button
                    type="button"
                    onClick={logout}
                    className="px-4 py-2 rounded-lg border border-error/30 text-error hover:bg-error/10 font-label-md text-label-md transition-colors"
                  >
                    Log Out
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-label-md text-label-md shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50"
                  >
                    {saving ? 'Saving…' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}

          {activeSection === 'appearance' && (
            <div className="glass-panel rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10 pointer-events-none" />
              <div className="flex flex-col gap-2">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Appearance</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Customize how Lore Canvas looks for you.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">Dark Mode</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Use dark theme across the app</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleTheme}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      theme === 'dark' ? 'bg-indigo-electric' : 'bg-surface-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">Compact Mode</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Reduce spacing and density</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleCompact}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      compact ? 'bg-indigo-electric' : 'bg-surface-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        compact ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">Animations</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Enable UI transitions and motion</p>
                  </div>
                  <button
                    type="button"
                    onClick={toggleAnimations}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      animations ? 'bg-indigo-electric' : 'bg-surface-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        animations ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'notifications' && (
            <div className="glass-panel rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10 pointer-events-none" />
              <div className="flex flex-col gap-2">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Notifications</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Manage how you receive updates.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">Email Notifications</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Receive updates via email</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, emailNotifications: !prev.emailNotifications }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.emailNotifications ? 'bg-indigo-electric' : 'bg-surface-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">Push Notifications</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Receive push alerts</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setForm((prev) => ({ ...prev, pushNotifications: !prev.pushNotifications }))}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      form.pushNotifications ? 'bg-indigo-electric' : 'bg-surface-variant'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                        form.pushNotifications ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'security' && (
            <div className="glass-panel rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10 pointer-events-none" />
              <div className="flex flex-col gap-2">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Security</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Manage your account security preferences.</p>
              </div>
              <div className="flex flex-col gap-4">
                {hasPassword ? (
                  <form onSubmit={handlePasswordChange} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Current Password</label>
                      <input
                        type="password"
                        value={passwordForm.currentPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-md text-body-md"
                        placeholder="Enter current password"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-md text-body-md"
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-md text-body-md"
                        placeholder="Confirm new password"
                      />
                    </div>
                    {passwordError && <p className="text-error text-sm">{passwordError}</p>}
                    {passwordSuccess && <p className="text-emerald-400 text-sm">{passwordSuccess}</p>}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-label-md text-label-md shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50"
                      >
                        {changingPassword ? 'Updating…' : 'Update Password'}
                      </button>
                    </div>
                  </form>
                ) : (
                  <form onSubmit={(e) => { e.preventDefault(); handleSetPassword(); }} className="flex flex-col gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Set Password</label>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Your account was created with Google or GitHub. Set a password to enable email/password login.</p>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">New Password</label>
                      <input
                        type="password"
                        value={passwordForm.newPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-md text-body-md"
                        placeholder="Enter new password"
                        required
                        minLength={8}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <label className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Confirm New Password</label>
                      <input
                        type="password"
                        value={passwordForm.confirmPassword}
                        onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                        className="input-line w-full text-on-surface py-2 font-body-md text-body-md"
                        placeholder="Confirm new password"
                        required
                        minLength={8}
                      />
                    </div>
                    {passwordError && <p className="text-error text-sm">{passwordError}</p>}
                    {passwordSuccess && <p className="text-emerald-400 text-sm">{passwordSuccess}</p>}
                    <div className="flex justify-end">
                      <button
                        type="submit"
                        disabled={changingPassword}
                        className="bg-primary-container text-on-primary-container px-6 py-2 rounded-lg font-label-md text-label-md shadow-[0_0_15px_rgba(79,70,229,0.3)] hover:shadow-[0_0_20px_rgba(79,70,229,0.5)] transition-all disabled:opacity-50"
                      >
                        {changingPassword ? 'Saving…' : 'Set Password'}
                      </button>
                    </div>
                  </form>
                )}
              </div>
            </div>
          )}

          {activeSection === 'integrations' && (
            <div className="glass-panel rounded-xl p-6 flex flex-col gap-6 relative overflow-hidden">
              <div className="absolute -top-20 -right-20 w-64 h-64 bg-primary rounded-full blur-[100px] opacity-10 pointer-events-none" />
              <div className="flex flex-col gap-2">
                <h2 className="font-headline-lg text-headline-lg text-on-surface">API & Integrations</h2>
                <p className="font-body-md text-body-md text-on-surface-variant">Manage external connections and API access.</p>
              </div>
              <div className="flex flex-col gap-4">
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">API Key</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Manage your API keys</p>
                  </div>
                  <button type="button" className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 font-label-md text-label-md transition-colors">
                    Manage Keys
                  </button>
                </div>
                <div className="flex items-center justify-between p-4 rounded-lg bg-surface-container/20 border border-outline-variant/20">
                  <div>
                    <h3 className="font-label-md text-label-md text-on-surface">Connected Apps</h3>
                    <p className="font-body-sm text-body-sm text-on-surface-variant">Manage third-party integrations</p>
                  </div>
                  <button type="button" className="px-4 py-2 rounded-lg border border-outline-variant/30 text-on-surface-variant hover:bg-surface-variant/30 font-label-md text-label-md transition-colors">
                    Manage
                  </button>
                </div>
              </div>
            </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
