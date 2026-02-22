import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';

export function UserAvatar({ className }: { className?: string }) {
  return (
    <Avatar className={className}>
      <AvatarImage />
      <AvatarFallback>Guest</AvatarFallback>
    </Avatar>
  );
}
