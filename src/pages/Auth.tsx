import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { motion } from 'framer-motion';
import { Mail, Lock, LogIn, UserPlus, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const Auth = () => {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const errorMsg = searchParams.get('error');
    if (errorMsg) {
      toast({
        title: t('authError'),
        description: decodeURIComponent(errorMsg),
        variant: 'destructive',
      });
    }
  }, [searchParams, t, toast]);

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast({
          title: t('checkEmail'),
          description: t('confirmEmailSent'),
        });
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      toast({
        title: t('authError'),
        description: err.message || 'Check your credentials or Supabase configuration',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/oauth/callback`,
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error('Google auth error:', err);
      toast({
        title: t('authError'),
        description: (
          <div className="space-y-2">
            <p>{err.message || 'Error starting Google Auth'}</p>
            <div className="text-[10px] bg-muted p-2 rounded border border-border mt-2">
              <p className="font-bold uppercase">Instructions:</p>
              <ul className="list-disc pl-3 mt-1">
                <li>Check Google Provider in Supabase Dashboard.</li>
                <li>Add {window.location.origin}/oauth/callback to Redirect URLs in Supabase.</li>
              </ul>
            </div>
          </div>
        ) as any,
        variant: 'destructive',
      });
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="text-center mb-8">
          <h1 className="text-3xl font-extrabold text-foreground mb-2">ChimeUp</h1>
          <p className="text-muted-foreground text-sm">{t('authSubtitle')}</p>
        </div>

        <div className="bg-card rounded-3xl border border-border p-6 shadow-lg space-y-5">
          {/* Google */}
          <Button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            variant="outline"
            className="w-full h-12 rounded-2xl font-bold text-sm gap-2"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            {t('signInGoogle')}
          </Button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-card px-3 text-muted-foreground">{t('orEmail')}</span>
            </div>
          </div>

          {/* Email form */}
          <form onSubmit={handleEmailAuth} className="space-y-3">
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="email"
                value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="Email"
                required
                className="h-12 rounded-2xl pl-10 bg-secondary/50 border-0"
              />
            </div>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder={t('password')}
                required
                minLength={6}
                className="h-12 rounded-2xl pl-10 bg-secondary/50 border-0"
              />
            </div>
            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 rounded-2xl font-bold text-sm"
            >
              {loading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : isLogin ? (
                <><LogIn className="w-4 h-4 mr-2" />{t('signIn')}</>
              ) : (
                <><UserPlus className="w-4 h-4 mr-2" />{t('signUp')}</>
              )}
            </Button>
          </form>

          <p className="text-center text-sm text-muted-foreground">
            {isLogin ? t('noAccount') : t('haveAccount')}{' '}
            <button
              onClick={() => setIsLogin(!isLogin)}
              className="text-primary font-bold hover:underline"
            >
              {isLogin ? t('signUp') : t('signIn')}
            </button>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
