
import React, { useState } from 'react';
import { User } from '../types';

interface AuthScreenProps {
  onLogin: (user: User) => void;
}

type AuthMode = 'LOGIN' | 'REGISTER';
type AuthStep = 'CREDENTIALS' | 'VERIFICATION';

const AuthScreen: React.FC<AuthScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<AuthMode>('LOGIN');
  const [step, setStep] = useState<AuthStep>('CREDENTIALS');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // Note: In a real app, hash passwords. This is a local simulation.
  const [name, setName] = useState('');
  
  const [verificationCode, setVerificationCode] = useState('');
  const [userEnteredCode, setUserEnteredCode] = useState('');
  
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const generateCode = () => {
    return Math.floor(100000 + Math.random() * 900000).toString();
  };

  const handleCredentialsSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    // --- HARDCODED ADMIN CHECK (Bypass 2FA for convenience or impl 2FA for them too) ---
    if (email === 'admin@mythosqa.com' && password === 'Admin123!') {
      const adminUser: User = {
        id: 'admin-master-id',
        email: 'admin@mythosqa.com',
        name: 'System Administrator',
        createdAt: Date.now(),
        role: 'ADMIN'
      };
      onLogin(adminUser);
      return;
    }

    const storedUsersStr = localStorage.getItem('mythos_users');
    const users: (User & { password: string })[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

    if (mode === 'LOGIN') {
      const user = users.find(u => u.email === email && u.password === password);
      if (user) {
         // Generate 2FA code
         const code = generateCode();
         setVerificationCode(code);
         setStep('VERIFICATION');
         // Simulate sending
         setTimeout(() => alert(`[MYTHOS QA SECURITY]\n\nYour 2FA Verification Code is: ${code}`), 500);
      } else {
        setError('Invalid email or password.');
      }
    } else {
      // REGISTER
      if (users.some(u => u.email === email)) {
        setError('User already exists with this email.');
        return;
      }
      // Generate 2FA code for verification of new account
      const code = generateCode();
      setVerificationCode(code);
      setStep('VERIFICATION');
      setTimeout(() => alert(`[MYTHOS QA SECURITY]\n\nYour Registration Verification Code is: ${code}`), 500);
    }
  };

  const handleVerificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (userEnteredCode !== verificationCode) {
      setError("Invalid verification code. Please try again.");
      return;
    }

    // Code is valid
    const storedUsersStr = localStorage.getItem('mythos_users');
    const users: (User & { password: string })[] = storedUsersStr ? JSON.parse(storedUsersStr) : [];

    if (mode === 'LOGIN') {
        const user = users.find(u => u.email === email && u.password === password);
        if (user) {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { password: _, ...safeUser } = user;
            if (!safeUser.role) safeUser.role = 'USER';
            onLogin(safeUser);
        }
    } else {
        // Register Finalize
        const newUser = {
            id: Date.now().toString(),
            email,
            name: name || email.split('@')[0],
            password,
            createdAt: Date.now(),
            role: 'USER' as const
        };
        
        localStorage.setItem('mythos_users', JSON.stringify([...users, newUser]));
        
        // Reset to Login screen as requested "Require users to login after successful registration"
        setSuccessMsg("Registration successful! Please log in with your new credentials.");
        setMode('LOGIN');
        setStep('CREDENTIALS');
        setPassword('');
        setUserEnteredCode('');
        setVerificationCode('');
    }
  };

  const switchMode = () => {
    setMode(mode === 'LOGIN' ? 'REGISTER' : 'LOGIN');
    setStep('CREDENTIALS');
    setError(null);
    setSuccessMsg(null);
    setUserEnteredCode('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 p-4 transition-colors duration-300">
      <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden animate-fade-in">
        <div className="p-8 text-center">
          <div className="w-16 h-16 bg-black rounded-xl flex items-center justify-center text-white shadow-lg mx-auto mb-6 border border-slate-800">
             <span className="font-serif text-3xl font-bold text-yellow-500">M</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
            Welcome to Mythos<span className="text-yellow-600 dark:text-yellow-500">QA</span>
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            {step === 'VERIFICATION' 
              ? 'Two-Factor Authentication' 
              : (mode === 'LOGIN' ? 'Sign in to access your artifacts' : 'Create an account to get started')}
          </p>
        </div>

        {step === 'CREDENTIALS' ? (
            <form onSubmit={handleCredentialsSubmit} className="px-8 pb-8 space-y-4">
            {mode === 'REGISTER' && (
                <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Full Name</label>
                <input
                    type="text"
                    required={mode === 'REGISTER'}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                    placeholder="John Doe"
                />
                </div>
            )}
            
            <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Email Address</label>
                <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                placeholder="name@company.com"
                />
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Password</label>
                <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                placeholder="••••••••"
                />
            </div>

            {error && (
                <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                {error}
                </div>
            )}
            
            {successMsg && (
                <div className="text-green-600 text-sm text-center bg-green-50 dark:bg-green-900/20 p-2 rounded">
                {successMsg}
                </div>
            )}

            <button
                type="submit"
                className="w-full py-3 bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold rounded-lg hover:bg-slate-800 dark:hover:bg-slate-200 transition-colors shadow-lg"
            >
                {mode === 'LOGIN' ? 'Verify & Sign In' : 'Verify & Register'}
            </button>
            </form>
        ) : (
            <form onSubmit={handleVerificationSubmit} className="px-8 pb-8 space-y-4">
                <div className="text-center mb-4">
                    <p className="text-sm text-slate-600 dark:text-slate-300">
                        We've sent a 6-digit verification code to <span className="font-bold">{email}</span>.
                    </p>
                    <p className="text-xs text-slate-400 mt-2">(Simulated: check browser alert)</p>
                </div>

                <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase mb-1">Verification Code</label>
                    <input
                        type="text"
                        required
                        maxLength={6}
                        value={userEnteredCode}
                        onChange={(e) => setUserEnteredCode(e.target.value.replace(/\D/g, ''))}
                        className="w-full px-4 py-3 text-center text-2xl tracking-widest font-mono border border-slate-300 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-colors"
                        placeholder="000000"
                    />
                </div>

                {error && (
                    <div className="text-red-500 text-sm text-center bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    {error}
                    </div>
                )}

                <button
                    type="submit"
                    className="w-full py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
                >
                    Confirm & {mode === 'LOGIN' ? 'Login' : 'Complete Registration'}
                </button>
                
                <button
                    type="button"
                    onClick={() => { setStep('CREDENTIALS'); setError(null); }}
                    className="w-full py-2 text-slate-500 dark:text-slate-400 text-sm hover:underline"
                >
                    Back to credentials
                </button>
            </form>
        )}

        {step === 'CREDENTIALS' && (
            <div className="px-8 py-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 text-center text-sm">
            <button 
                onClick={switchMode}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
                {mode === 'LOGIN' ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
            </button>
            </div>
        )}
      </div>
    </div>
  );
};

export default AuthScreen;
