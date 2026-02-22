import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { useAuth } from '@/contexts/AuthContext';
import { ConditionalWrapper } from '@/components/ConditionalWrapper';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ProfilePopoverContent } from './ProfilePopoverContent';

interface AuthButtonProps {
  isSidebarOpen: boolean;
}

export function AuthButton({ isSidebarOpen }: AuthButtonProps) {
  const { user } = useAuth();

  // Check if user is authenticated (not anonymous)
  const isAuthenticated = user && !user.is_anonymous;

  // Only show for authenticated users - unauthenticated users see the floating modal
  if (!isAuthenticated) return null;

  // Get user display info
  const userEmail = user?.email;
  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name;
  const userAvatar = user?.user_metadata?.avatar_url;
  const userInitials = userName
    ? userName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : userEmail?.charAt(0).toUpperCase() || 'U';

  return (
    <Popover>
      <ConditionalWrapper
        condition={!isSidebarOpen}
        wrapper={(children) => (
          <Tooltip>
            <TooltipTrigger asChild>{children}</TooltipTrigger>
            <TooltipContent side="right" className="flex flex-col">
              <span className="font-semibold">Profile</span>
              <span className="text-xs text-muted-foreground">{userEmail}</span>
            </TooltipContent>
          </Tooltip>
        )}
      >
        <PopoverTrigger asChild>
          <Button
            variant={isSidebarOpen ? 'grainz_dark' : 'grainz_dark_collapsed_avatar'}
            className={`${isSidebarOpen ? 'w-full justify-start' : 'ml-[1px] h-[46px] w-[46px] p-0'}`}
          >
            <Avatar
              className={`${isSidebarOpen ? 'mr-2' : ''} h-[22px] w-[22px] min-w-[22px]`}
            >
              <AvatarImage src={userAvatar} alt={userName || userEmail} />
              <AvatarFallback className="text-[10px] text-white">
                {userInitials}
              </AvatarFallback>
            </Avatar>
            {isSidebarOpen && (
              <span className="truncate">
                {userName || userEmail || 'Profile'}
              </span>
            )}
          </Button>
        </PopoverTrigger>
      </ConditionalWrapper>
      <PopoverContent side="right" align="end" className="w-80">
        <ProfilePopoverContent
          userName={userName}
          userEmail={userEmail}
          userAvatar={userAvatar}
          userInitials={userInitials}
        />
      </PopoverContent>
    </Popover>
  );
}
