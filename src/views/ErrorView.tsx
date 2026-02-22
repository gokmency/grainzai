import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

export function ErrorView() {
  const navigate = useNavigate();

  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-4 bg-grainz-bg-secondary-dark">
      <h1 className="text-2xl font-bold text-grainz-text-primary">
        Oops! Something went wrong.
      </h1>
      <p className="text-center text-grainz-text-secondary">
        We're sorry, but an error occurred while loading this page.
        <br />
        Please feel free to reach out to us so that we can resolve this issue.
      </p>
      <Button onClick={() => navigate('/')}>Go to Home</Button>
    </div>
  );
}
