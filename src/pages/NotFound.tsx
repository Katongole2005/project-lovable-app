import { useNavigate } from "react-router-dom";
import { useSeo } from "@/hooks/useSeo";
import { Home, Search, Film } from "lucide-react";
import { Button } from "@/components/ui/button";

const NotFound = () => {
  const navigate = useNavigate();
  useSeo({ title: "Page Not Found", description: "The page you're looking for doesn't exist on Moviebay." });

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="text-center max-w-md space-y-6">
        {/* Animated film reel illustration */}
        <div className="relative mx-auto w-32 h-32">
          <div className="absolute inset-0 rounded-full bg-primary/10 animate-pulse" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-16 h-16 text-primary/60" />
          </div>
          {/* Orbiting dot */}
          <div className="absolute inset-0 animate-spin" style={{ animationDuration: "6s" }}>
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-primary" />
          </div>
        </div>

        {/* Error text */}
        <div className="space-y-2">
          <h1 className="text-7xl font-bold text-foreground tracking-tight">404</h1>
          <p className="text-xl font-semibold text-foreground">Scene not found</p>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Looks like this scene was left on the cutting room floor. 
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Button onClick={() => navigate("/")} className="gap-2">
            <Home className="w-4 h-4" />
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => navigate("/search")} className="gap-2">
            <Search className="w-4 h-4" />
            Search Content
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
