import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { AnimatedEllipsis } from '@/components/chat/AnimatedEllipsis';

export function AssistantLoading() {
  return (
    <div className="flex w-full p-1">
      <div className="mr-2 mt-1">
        <Avatar className="h-9 w-9 border border-grainz-neutral-700 bg-grainz-neutral-950">
          <AvatarFallback className="bg-transparent text-xs font-semibold text-grainz-blue">
            G
          </AvatarFallback>
        </Avatar>
      </div>
      <div className="flex max-w-[80%] flex-col items-center justify-center gap-2 rounded-lg bg-grainz-neutral-800 p-3">
        <AnimatedEllipsis color="grainz-neutral" />
      </div>
    </div>
  );
}
