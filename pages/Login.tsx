import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, Mail, ArrowRight, BarChart3, TrendingUp, User, KeyRound, ShieldQuestion, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';

type AuthView = 'login' | 'register' | 'forgot-password' | 'reset-password';

const SECURITY_QUESTIONS = [
  "What is your favorite color?",
  "What is your pet's name?",
  "What city were you born in?",
  "What is your mother's maiden name?",
  "What was the name of your first school?",
  "What is your favorite movie?",
];

// ─── STABLE SUB-COMPONENTS (defined OUTSIDE Login to prevent re-mount on state change) ───

const MessageBanner: React.FC<{ error: string; success: string }> = ({ error, success }) => (
  <>
    {error && (
      <div className="bg-red-50 border border-red-100 text-red-600 text-sm p-4 rounded-xl flex items-center gap-3">
        <AlertCircle size={18} className="flex-shrink-0" />
        {error}
      </div>
    )}
    {success && (
      <div className="bg-emerald-50 border border-emerald-100 text-emerald-600 text-sm p-4 rounded-xl flex items-center gap-3">
        <CheckCircle size={18} className="flex-shrink-0" />
        {success}
      </div>
    )}
  </>
);

const InputField: React.FC<{
  icon: any; label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder: string; required?: boolean;
}> = ({ icon: Icon, label, type = 'text', value, onChange, placeholder, required = true }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
    <div className="relative group">
      <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 transition-all placeholder:text-slate-400 font-medium"
        placeholder={placeholder}
        required={required}
      />
    </div>
  </div>
);

const PasswordField: React.FC<{
  label: string; value: string; onChange: (v: string) => void;
  placeholder: string; show: boolean; toggleShow: () => void;
}> = ({ label, value, onChange, placeholder, show, toggleShow }) => (
  <div>
    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">{label}</label>
    <div className="relative group">
      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
      <input
        type={show ? 'text' : 'password'}
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full pl-11 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 transition-all placeholder:text-slate-400 font-medium"
        placeholder={placeholder}
        required
      />
      <button
        type="button"
        onClick={toggleShow}
        className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
        tabIndex={-1}
      >
        {show ? <EyeOff size={18} /> : <Eye size={18} />}
      </button>
    </div>
  </div>
);

const SubmitButton: React.FC<{ text: string; isLoading: boolean }> = ({ text, isLoading }) => (
  <button
    type="submit"
    disabled={isLoading}
    className="w-full bg-slate-900 text-white py-4 rounded-xl font-bold text-lg hover:bg-indigo-600 transition-all duration-300 shadow-xl shadow-slate-200 hover:shadow-indigo-200 flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed mt-4 group"
  >
    {isLoading ? (
      <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
    ) : (
      <>{text} <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" /></>
    )}
  </button>
);

// ─── MAIN LOGIN COMPONENT ────────────────────────

const Login: React.FC = () => {
  const { login, register, forgotPassword, resetPassword } = useAuth();

  // View state
  const [view, setView] = useState<AuthView>('login');

  // Login form
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Register form
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regSecurityQuestion, setRegSecurityQuestion] = useState(SECURITY_QUESTIONS[0]);
  const [regSecurityAnswer, setRegSecurityAnswer] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);

  // Forgot password form
  const [forgotEmail, setForgotEmail] = useState('');
  const [securityQuestion, setSecurityQuestion] = useState('');
  const [securityAnswer, setSecurityAnswer] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');

  // Messages
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const clearMessages = () => {
    setError('');
    setSuccess('');
  };

  const switchView = (newView: AuthView) => {
    clearMessages();
    setView(newView);
  };

  // ─── LOGIN HANDLER ─────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    try {
      const result = await login(email, password);
      if (!result) {
        setError('Invalid email or password. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Is the backend running?');
    }
    setIsLoading(false);
  };

  // ─── REGISTER HANDLER ─────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    if (regPassword !== regConfirmPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (regPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    if (!regSecurityAnswer.trim()) {
      setError('Security answer is required for password recovery.');
      setIsLoading(false);
      return;
    }

    const result = await register({
      name: regName,
      email: regEmail,
      password: regPassword,
      security_question: regSecurityQuestion,
      security_answer: regSecurityAnswer,
    });

    if (result.success) {
      setSuccess('Registration successful! You can now sign in.');
      setTimeout(() => switchView('login'), 1500);
    } else {
      setError(result.error || 'Registration failed.');
    }
    setIsLoading(false);
  };

  // ─── FORGOT PASSWORD HANDLER ──────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    const result = await forgotPassword(forgotEmail);
    if (result.success && result.security_question) {
      setSecurityQuestion(result.security_question);
      switchView('reset-password');
    } else {
      setError(result.error || 'No account found with this email.');
    }
    setIsLoading(false);
  };

  // ─── RESET PASSWORD HANDLER ───────────────────
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    clearMessages();

    if (newPassword !== confirmNewPassword) {
      setError('Passwords do not match.');
      setIsLoading(false);
      return;
    }

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      setIsLoading(false);
      return;
    }

    const result = await resetPassword(forgotEmail, securityAnswer, newPassword);
    if (result.success) {
      setSuccess('Password reset successful! You can now sign in with your new password.');
      setTimeout(() => switchView('login'), 2000);
    } else {
      setError(result.error || 'Password reset failed.');
    }
    setIsLoading(false);
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center overflow-hidden bg-slate-900 font-sans">
      {/* Background Image with Overlay */}
      <div
        className="absolute inset-0 z-0 opacity-40"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?ixlib=rb-4.0.3&auto=format&fit=crop&w=2070&q=80")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
      />

      {/* Abstract Animated Glows */}
      <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-indigo-600/30 rounded-full blur-[120px] animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-emerald-600/20 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '1s' }}></div>

      {/* Main Container */}
      <div className="w-full max-w-[1100px] grid grid-cols-1 lg:grid-cols-2 z-10 m-4 rounded-[2.5rem] overflow-hidden shadow-2xl shadow-black/50 min-h-[600px]">

        {/* Left Side: Brand Panel */}
        <div className="hidden lg:flex flex-col justify-between p-12 relative bg-slate-900/80 backdrop-blur-md text-white border-r border-white/5">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-emerald-500"></div>

          <div>
            <div className="flex items-center gap-3 mb-10">
              <div className="w-12 h-12 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/30 border border-white/10">
                <span className="font-bold text-2xl text-white">I</span>
              </div>
              <span className="font-bold text-2xl tracking-tight">Invenio<span className="text-indigo-400">AI</span></span>
            </div>

            <h2 className="text-4xl font-bold leading-tight mb-6">
              Smarter Inventory <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-emerald-400">Operations</span>
            </h2>
            <p className="text-slate-300 leading-relaxed max-w-sm text-lg">
              Next-generation warehouse management powered by predictive AI. Optimize stock levels and forecast demand with precision.
            </p>
          </div>

          {/* Feature Pills */}
          <div className="space-y-5">
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <BarChart3 className="text-indigo-400" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white">Real-time Analytics</h4>
                <p className="text-xs text-slate-400">Live sales & stock tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <TrendingUp className="text-emerald-400" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white">AI-Powered Predictions</h4>
                <p className="text-xs text-slate-400">Smart demand forecasting</p>
              </div>
            </div>
            <div className="flex items-center gap-4 p-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <div className="w-10 h-10 rounded-full bg-violet-500/20 flex items-center justify-center">
                <KeyRound className="text-violet-400" size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-white">Secure Access Control</h4>
                <p className="text-xs text-slate-400">Protected user authentication</p>
              </div>
            </div>
          </div>

          <div className="text-xs text-slate-500 mt-8 flex justify-between items-end">
            <span>&copy; 2024 Invenio Systems Inc.</span>
            <span className="opacity-50">v2.4.0</span>
          </div>
        </div>

        {/* Right Side: Auth Forms */}
        <div className="bg-white p-8 lg:p-12 flex flex-col justify-center relative overflow-y-auto max-h-screen">

          {/* Mobile Header */}
          <div className="mb-8 lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <span className="font-bold text-white">I</span>
            </div>
            <span className="text-2xl font-bold text-slate-900">Invenio<span className="text-indigo-600">AI</span></span>
          </div>

          {/* ═══════ LOGIN VIEW ═══════ */}
          {view === 'login' && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Welcome Back</h1>
                <p className="text-slate-500 text-lg">Sign in to access your dashboard.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-5">
                <InputField icon={Mail} label="Email Address" type="email" value={email} onChange={setEmail} placeholder="name@company.com" />
                <PasswordField label="Password" value={password} onChange={setPassword} placeholder="Enter your password" show={showPassword} toggleShow={() => setShowPassword(!showPassword)} />

                <div className="flex items-center justify-between text-sm pt-1">
                  <label className="flex items-center gap-2 cursor-pointer group">
                    <input type="checkbox" className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer" />
                    <span className="text-slate-500 font-medium group-hover:text-slate-700 transition-colors">Remember me</span>
                  </label>
                  <button type="button" onClick={() => switchView('forgot-password')} className="text-indigo-600 font-bold hover:text-indigo-700 hover:underline">
                    Forgot password?
                  </button>
                </div>

                <MessageBanner error={error} success={success} />
                <SubmitButton text="Sign In" isLoading={isLoading} />
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-center text-slate-500 mb-4">
                  Don't have an account?{' '}
                  <button onClick={() => switchView('register')} className="text-indigo-600 font-bold hover:underline">
                    Create Account
                  </button>
                </p>
                <div className="text-xs text-slate-400 text-center mb-3 uppercase tracking-wider font-semibold">Default Accounts</div>
                <div className="flex flex-wrap gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => { setEmail('admin@invenio.ai'); setPassword('admin123'); }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-mono text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    admin / admin123
                  </button>
                  <button
                    type="button"
                    onClick={() => { setEmail('manager@invenio.ai'); setPassword('manager123'); }}
                    className="px-3 py-1.5 bg-slate-50 hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-lg text-xs font-mono text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                  >
                    manager / manager123
                  </button>
                </div>
              </div>
            </>
          )}

          {/* ═══════ REGISTER VIEW ═══════ */}
          {view === 'register' && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Create Account</h1>
                <p className="text-slate-500">Register to get started with Invenio AI.</p>
              </div>

              <form onSubmit={handleRegister} className="space-y-4">
                <InputField icon={User} label="Full Name" value={regName} onChange={setRegName} placeholder="John Doe" />
                <InputField icon={Mail} label="Email Address" type="email" value={regEmail} onChange={setRegEmail} placeholder="name@company.com" />
                <PasswordField label="Password (min 6 chars)" value={regPassword} onChange={setRegPassword} placeholder="Choose a strong password" show={showRegPassword} toggleShow={() => setShowRegPassword(!showRegPassword)} />

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={e => setRegConfirmPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 transition-all placeholder:text-slate-400 font-medium"
                      placeholder="Re-enter password"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Security Question (for password recovery)</label>
                  <div className="relative group">
                    <ShieldQuestion className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <select
                      value={regSecurityQuestion}
                      onChange={e => setRegSecurityQuestion(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 transition-all font-medium appearance-none cursor-pointer"
                    >
                      {SECURITY_QUESTIONS.map(q => (
                        <option key={q} value={q}>{q}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <InputField icon={KeyRound} label="Security Answer" value={regSecurityAnswer} onChange={setRegSecurityAnswer} placeholder="Your answer..." />

                <MessageBanner error={error} success={success} />
                <SubmitButton text="Create Account" isLoading={isLoading} />
              </form>

              <p className="text-center text-slate-500 mt-6">
                Already have an account?{' '}
                <button onClick={() => switchView('login')} className="text-indigo-600 font-bold hover:underline">
                  Sign In
                </button>
              </p>
            </>
          )}

          {/* ═══════ FORGOT PASSWORD VIEW ═══════ */}
          {view === 'forgot-password' && (
            <>
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Forgot Password</h1>
                <p className="text-slate-500">Enter your email to retrieve your security question.</p>
              </div>

              <form onSubmit={handleForgotPassword} className="space-y-5">
                <InputField icon={Mail} label="Email Address" type="email" value={forgotEmail} onChange={setForgotEmail} placeholder="name@company.com" />
                <MessageBanner error={error} success={success} />
                <SubmitButton text="Retrieve Security Question" isLoading={isLoading} />
              </form>

              <p className="text-center text-slate-500 mt-6">
                Remember your password?{' '}
                <button onClick={() => switchView('login')} className="text-indigo-600 font-bold hover:underline">
                  Sign In
                </button>
              </p>
            </>
          )}

          {/* ═══════ RESET PASSWORD VIEW ═══════ */}
          {view === 'reset-password' && (
            <>
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-slate-900 tracking-tight mb-2">Reset Password</h1>
                <p className="text-slate-500">Answer your security question and set a new password.</p>
              </div>

              <form onSubmit={handleResetPassword} className="space-y-4">
                <div className="bg-indigo-50 border border-indigo-100 p-4 rounded-xl">
                  <div className="text-xs font-bold text-indigo-500 uppercase tracking-wider mb-1">Security Question</div>
                  <p className="text-indigo-800 font-semibold">{securityQuestion}</p>
                </div>

                <InputField icon={KeyRound} label="Security Answer" value={securityAnswer} onChange={setSecurityAnswer} placeholder="Your answer..." />
                <PasswordField label="New Password (min 6 chars)" value={newPassword} onChange={setNewPassword} placeholder="Choose a new password" show={showPassword} toggleShow={() => setShowPassword(!showPassword)} />

                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Confirm New Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600 transition-colors" size={20} />
                    <input
                      type="password"
                      value={confirmNewPassword}
                      onChange={e => setConfirmNewPassword(e.target.value)}
                      className="w-full pl-11 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800 transition-all placeholder:text-slate-400 font-medium"
                      placeholder="Re-enter new password"
                      required
                    />
                  </div>
                </div>

                <MessageBanner error={error} success={success} />
                <SubmitButton text="Reset Password" isLoading={isLoading} />
              </form>

              <p className="text-center text-slate-500 mt-6">
                <button onClick={() => switchView('login')} className="text-indigo-600 font-bold hover:underline">
                  Back to Sign In
                </button>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;