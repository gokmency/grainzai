import { useState } from 'react';
import { X, ArrowLeft, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
  InputOTPSeparator,
} from '@/components/ui/input-otp';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

type ViewState = 'prompt' | 'emailSent';

export function FloatingAuthModal() {
  const { user, signInWithEmail, signInWithGoogle, verifyOtp } = useAuth();
  const [view, setView] = useState<ViewState>('prompt');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show if user is authenticated (not anonymous) or if dismissed
  const isAuthenticated = user && !user.is_anonymous;
  if (isAuthenticated || isDismissed) return null;

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await signInWithEmail(email);
      setView('emailSent');
    } catch (error) {
      toast({
        title: 'Failed to send email',
        description:
          error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !otp) return;

    setIsLoading(true);
    try {
      await verifyOtp(email, otp);
    } catch (error) {
      toast({
        title: 'Verification failed',
        description:
          error instanceof Error
            ? error.message
            : 'Invalid code. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      await signInWithGoogle();
    } catch (error) {
      toast({
        title: 'Google sign in failed',
        description:
          error instanceof Error ? error.message : 'Please try again',
        variant: 'destructive',
      });
    }
  };

  const handleBack = () => {
    setView('prompt');
    setOtp('');
  };

  return (
    <div
      role="dialog"
      aria-label="Sign in"
      className="fixed bottom-6 right-6 z-50 w-[340px] overflow-hidden rounded-xl border border-white/10 bg-[#191A1A]/95 shadow-2xl backdrop-blur-md transition-all duration-300 animate-in fade-in slide-in-from-bottom-4"
    >
      {/* Header with close button */}
      <div className="absolute right-4 top-4 z-10">
        <button
          onClick={() => setIsDismissed(true)}
          className="rounded-full p-1 text-grainz-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {view !== 'prompt' && (
        <div className="absolute left-4 top-4 z-10">
          <button
            onClick={handleBack}
            className="rounded-full p-1 text-grainz-neutral-400 transition-colors hover:bg-white/5 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="p-6 pt-10">
        {view === 'prompt' && (
          <div className="flex flex-col gap-5">
            {/* Logo and Title */}
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="relative flex items-center justify-center rounded-xl bg-gradient-to-br from-grainz-blue/20 to-transparent px-4 py-2">
                <span className="text-lg font-semibold tracking-tight text-grainz-neutral-10">
                  GRAINZ AI
                </span>
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold leading-tight text-white">
                  Sign in or create an account
                </h3>
                <p className="text-sm text-grainz-neutral-400">
                  Save and access your creations
                </p>
              </div>
            </div>

            {/* Google Button */}
            <Button
              type="button"
              className="group relative w-full gap-2 overflow-hidden rounded-xl bg-[#00A6FF] py-5 text-sm font-medium text-white shadow-[0_0_20px_-5px_rgba(0,166,255,0.4)] transition-all hover:bg-[#0095E6] hover:shadow-[0_0_25px_-5px_rgba(0,166,255,0.5)]"
              onClick={handleGoogleSignIn}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="currentColor"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="currentColor"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="currentColor"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="currentColor"
                />
              </svg>
              <span>Continue with Google</span>
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#191A1A] px-2 text-grainz-neutral-500">
                  or
                </span>
              </div>
            </div>

            {/* Email Section */}
            <div className="space-y-3">
              <form
                onSubmit={handleEmailSubmit}
                className="flex flex-col gap-3"
              >
                <Input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="h-10 rounded-xl border-white/10 bg-white/5 px-4 text-sm text-white placeholder:text-grainz-neutral-500 focus:border-grainz-blue/50 focus:bg-white/10 focus:ring-0"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  className="w-full rounded-xl bg-grainz-neutral-800 py-5 text-sm font-medium text-grainz-neutral-200 transition-all hover:bg-grainz-neutral-700 hover:text-white"
                  disabled={isLoading || !email}
                >
                  {isLoading ? 'Sending...' : 'Continue with email'}
                </Button>
              </form>
            </div>
          </div>
        )}

        {view === 'emailSent' && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-grainz-blue/20 to-transparent">
                <Mail className="h-6 w-6 text-grainz-blue" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-semibold text-white">
                  Check your email
                </h3>
                <p className="text-sm text-grainz-neutral-400">
                  We sent a magic link to <br />
                  <span className="font-medium text-white">{email}</span>
                </p>
              </div>
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-white/10"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-[#191A1A] px-2 text-grainz-neutral-500">
                  Or enter code
                </span>
              </div>
            </div>

            <form onSubmit={handleOtpSubmit} className="flex flex-col gap-4">
              <div className="flex justify-center">
                <InputOTP
                  maxLength={6}
                  value={otp}
                  onChange={setOtp}
                  className="gap-1"
                >
                  <InputOTPGroup className="gap-1">
                    {[0, 1, 2].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-10 w-8 rounded-lg border-white/10 bg-white/5 text-sm font-medium text-white transition-all focus:border-grainz-blue/50 focus:bg-white/10"
                      />
                    ))}
                  </InputOTPGroup>
                  <InputOTPSeparator className="text-grainz-neutral-400" />
                  <InputOTPGroup className="gap-1">
                    {[3, 4, 5].map((index) => (
                      <InputOTPSlot
                        key={index}
                        index={index}
                        className="h-10 w-8 rounded-lg border-white/10 bg-white/5 text-sm font-medium text-white transition-all focus:border-grainz-blue/50 focus:bg-white/10"
                      />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>

              <Button
                type="submit"
                className="w-full rounded-xl bg-grainz-blue py-5 text-sm font-medium text-white shadow-[0_0_20px_-5px_rgba(0,166,255,0.4)] transition-all hover:bg-[#0095E6] hover:shadow-[0_0_25px_-5px_rgba(0,166,255,0.5)]"
                disabled={otp.length !== 6 || isLoading}
              >
                {isLoading ? 'Verifying...' : 'Verify Code'}
              </Button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
