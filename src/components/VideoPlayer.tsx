import { useRef, useEffect } from "react";
import { X, Maximize2, Minimize2 } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";

interface VideoPlayerProps {
  isOpen: boolean;
  onClose: () => void;
  videoUrl: string;
  title: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  startTime?: number;
}

export function VideoPlayer({ 
  isOpen, 
  onClose, 
  videoUrl, 
  title, 
  onTimeUpdate, 
  startTime = 0 
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (isOpen && videoRef.current && startTime > 0) {
      const video = videoRef.current;
      const handleLoadedMetadata = () => {
        if (startTime > 0 && !Number.isNaN(video.duration)) {
          video.currentTime = Math.min(startTime, video.duration);
        }
      };
      video.addEventListener("loadedmetadata", handleLoadedMetadata);
      return () => video.removeEventListener("loadedmetadata", handleLoadedMetadata);
    }
  }, [isOpen, startTime]);

  useEffect(() => {
    if (!isOpen && videoRef.current) {
      videoRef.current.pause();
    }
  }, [isOpen]);

  const handleTimeUpdate = () => {
    if (videoRef.current && onTimeUpdate) {
      onTimeUpdate(videoRef.current.currentTime, videoRef.current.duration);
    }
  };

  const handleClose = () => {
    if (videoRef.current) {
      handleTimeUpdate();
      videoRef.current.pause();
    }
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-5xl w-full p-0 bg-background border-none overflow-hidden">
        <div className="relative">
          {/* Header */}
          <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background/80 to-transparent">
            <h3 className="font-semibold text-foreground truncate pr-4">{title}</h3>
            <button
              onClick={handleClose}
              className="p-2 rounded-full bg-card/80 backdrop-blur hover:bg-card transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Video */}
          <video
            ref={videoRef}
            src={videoUrl}
            className="w-full aspect-video bg-background"
            controls
            autoPlay
            onTimeUpdate={handleTimeUpdate}
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </DialogContent>
    </Dialog>
  );
}
