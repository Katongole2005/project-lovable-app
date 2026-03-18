import { useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/useSeo";
import { Home, Search, Clapperboard } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();
  useSeo({ title: "Page Not Found", description: "The page you're looking for doesn't exist on Moviebay." });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 relative overflow-hidden">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-primary/10 blur-[100px] animate-pulse" />
        <div className="absolute bottom-1/4 right-1/4 w-80 h-80 rounded-full bg-secondary/8 blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />
      </div>

      <div className="text-center max-w-md space-y-8 relative z-10">
        <div className="relative mx-auto w-36 h-36">
          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-secondary/10 animate-pulse" />
          <div className="absolute inset-2 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center border border-border/30">
            <Clapperboard className="w-14 h-14 text-primary/70" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "8s" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2.5 h-2.5 rounded-full bg-primary shadow-[0_0_10px_hsl(210_100%_60%/0.6)]" />
          </div>
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "12s", animationDirection: "reverse" }}>
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-secondary shadow-[0_0_8px_hsl(180_70%_50%/0.5)]" />
          </div>
        </div>

        <div className="space-y-3">
          <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-foreground to-muted-foreground/50 tracking-tighter" data-testid="text-404">
            404
          </h1>
          <p className="text-xl font-semibold text-foreground" data-testid="text-not-found-title">Scene not found</p>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-xs mx-auto">
            Looks like this scene was left on the cutting room floor.
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={() => navigate("/")} className="gap-2 shadow-lg shadow-primary/20" data-testid="button-go-home">
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => navigate("/search")} className="gap-2" data-testid="button-search">
            <Search className="w-4 h-4" />
            Search Content
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
