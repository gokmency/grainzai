import { LogOut } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';

interface ProfilePopoverContentProps {
  userName?: string;
  userEmail?: string;
  userAvatar?: string;
  userInitials: string;
}

export function ProfilePopoverContent({
  userName,
  userEmail,
  userAvatar,
  userInitials,
}: ProfilePopoverContentProps) {
  const { signOut } = useAuth();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-3">
        <Avatar className="h-12 w-12">
          <AvatarImage src={userAvatar} alt={userName || userEmail} />
          <AvatarFallback className="text-sm text-white">
            {userInitials}
          </AvatarFallback>
        </Avatar>
        <div className="flex flex-col overflow-hidden">
          {userName && (
            <span className="truncate font-medium text-grainz-neutral-10">
              {userName}
            </span>
          )}
          {userEmail && (
            <span className="truncate text-sm text-grainz-neutral-400">
              {userEmail}
            </span>
          )}
        </div>
      </div>

      <div className="h-px bg-grainz-neutral-700" />

      <Button
        variant="outline"
        className="w-full justify-start gap-2 text-grainz-neutral-300 hover:text-grainz-neutral-10"
        onClick={() => signOut()}
      >
        <LogOut className="h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
