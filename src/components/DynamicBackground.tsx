import { memo } from "react";
import { cn } from "@/lib/utils";
import { useDeviceProfile } from "@/hooks/useDeviceProfile";

interface DynamicBackgroundProps {
  color?: string;
  className?: string;
}

function DynamicBackgroundInner({ className }: DynamicBackgroundProps) {
  const deviceProfile = useDeviceProfile();

  return (
    <div className={cn("fixed inset-0 -z-10 overflow-hidden pointer-events-none", className)}>
      <div className="absolute inset-0 bg-background" />
      {!deviceProfile.isWeakDevice && (
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')]" />
      )}
    </div>
  );
}

export const DynamicBackground = memo(DynamicBackgroundInner);
