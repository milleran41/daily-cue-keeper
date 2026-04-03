import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const OAuthRedirect = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (error) throw error;
        
        if (!session) {
          throw new Error('No session found after redirect');
        }
        
        // After getting the session, redirect to the main page
        navigate('/', { replace: true });
      } catch (error: any) {
        console.error('OAuth redirect error:', error);
        // Add a query param to show error on auth page
        const msg = error.message || 'Unknown error';
        const instructions = 'Check Site URL and Redirect URLs in Supabase Dashboard.';
        navigate(`/auth?error=${encodeURIComponent(msg + ' ' + instructions)}`, { replace: true });
      }
    };

    checkSession();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
      <p className="text-muted-foreground font-medium">Completing sign in...</p>
    </div>
  );
};

export default OAuthRedirect;
