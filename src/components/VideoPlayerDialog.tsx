import { useState } from 'react';
import { Play, X, ExternalLink } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VideoPlayerDialogProps {
  url: string;
  creativeId: string;
  trigger?: React.ReactNode;
}

// Extract video ID and type from URL
function parseVideoUrl(url: string): { type: 'youtube' | 'vimeo' | 'direct' | 'unknown'; embedUrl: string } {
  // YouTube patterns
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return {
      type: 'youtube',
      embedUrl: `https://www.youtube.com/embed/${youtubeMatch[1]}?autoplay=1`,
    };
  }

  // Vimeo patterns
  const vimeoMatch = url.match(/(?:vimeo\.com\/)(\d+)/);
  if (vimeoMatch) {
    return {
      type: 'vimeo',
      embedUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
    };
  }

  // Direct video file URLs
  if (url.match(/\.(mp4|webm|ogg|mov)(\?|$)/i)) {
    return {
      type: 'direct',
      embedUrl: url,
    };
  }

  // Unknown - try to use as-is
  return {
    type: 'unknown',
    embedUrl: url,
  };
}

// Get thumbnail URL for video
export function getVideoThumbnail(url: string): string | null {
  // YouTube
  const youtubeMatch = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/
  );
  if (youtubeMatch) {
    return `https://img.youtube.com/vi/${youtubeMatch[1]}/mqdefault.jpg`;
  }

  // For other types, return null (no thumbnail available)
  return null;
}

export function VideoPlayerDialog({ url, creativeId, trigger }: VideoPlayerDialogProps) {
  const [open, setOpen] = useState(false);
  const { type, embedUrl } = parseVideoUrl(url);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger ? (
        <div onClick={() => setOpen(true)}>{trigger}</div>
      ) : (
        <Button variant="ghost" size="icon" onClick={() => setOpen(true)}>
          <Play className="h-4 w-4" />
        </Button>
      )}
      <DialogContent className="max-w-4xl p-0 overflow-hidden">
        <DialogHeader className="p-4 pb-0">
          <DialogTitle className="flex items-center gap-2">
            <span className="font-mono text-sm">{creativeId}</span>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => window.open(url, '_blank')}
              title="Abrir em nova aba"
            >
              <ExternalLink className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="aspect-video bg-black">
          {type === 'direct' ? (
            <video
              src={embedUrl}
              controls
              autoPlay
              className="w-full h-full"
            >
              Seu navegador não suporta vídeos HTML5.
            </video>
          ) : type === 'unknown' ? (
            <div className="w-full h-full flex flex-col items-center justify-center gap-4 text-muted-foreground">
              <p>Formato de vídeo não reconhecido</p>
              <Button variant="outline" onClick={() => window.open(url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Abrir URL original
              </Button>
            </div>
          ) : (
            <iframe
              src={embedUrl}
              className="w-full h-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// Thumbnail component for table
interface VideoThumbnailProps {
  url: string | null;
  creativeId: string;
}

export function VideoThumbnail({ url, creativeId }: VideoThumbnailProps) {
  if (!url) {
    return (
      <TooltipProvider delayDuration={100}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="h-10 w-10 rounded bg-muted flex items-center justify-center">
              <Play className="h-4 w-4 text-muted-foreground opacity-30" />
            </div>
          </TooltipTrigger>
          <TooltipContent>Sem vídeo</TooltipContent>
        </Tooltip>
      </TooltipProvider>
    );
  }

  const thumbnail = getVideoThumbnail(url);

  return (
    <TooltipProvider delayDuration={100}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div>
            <VideoPlayerDialog
              url={url}
              creativeId={creativeId}
              trigger={
                <div className="h-10 w-10 rounded bg-muted flex items-center justify-center cursor-pointer hover:bg-muted/80 transition-colors relative group overflow-hidden">
                  {thumbnail ? (
                    <>
                      <img
                        src={thumbnail}
                        alt="Video thumbnail"
                        className="w-full h-full object-cover rounded"
                        onError={(e) => {
                          // Fallback to play icon if thumbnail fails to load
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                        <Play className="h-4 w-4 text-white fill-white" />
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center justify-center w-full h-full">
                      <Play className="h-4 w-4 text-primary group-hover:scale-110 transition-transform" />
                    </div>
                  )}
                </div>
              }
            />
          </div>
        </TooltipTrigger>
        <TooltipContent>Clique para assistir</TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
