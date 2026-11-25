import { Link, useRouter, type ErrorComponentProps } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function RetryError({ error, reset }: ErrorComponentProps) {
  const router = useRouter();
  console.error(error);
  return (
    <div className="container-page py-20 text-center">
      <h1 className="text-2xl font-bold">This page didn't load</h1>
      <p className="mt-2 text-muted-foreground">Please check your connection and try again.</p>
      <div className="mt-6 flex justify-center gap-2">
        <Button onClick={() => { void router.invalidate(); reset(); }}>Try again</Button>
        <Button asChild variant="outline"><Link to="/">Go home</Link></Button>
      </div>
    </div>
  );
}
