import React from 'react';
import { PlayCircle } from 'lucide-react';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.mov'];

const isDirectVideo = (url) =>
  VIDEO_EXTENSIONS.some((extension) => url.toLowerCase().endsWith(extension));

const isYouTubeUrl = (url) =>
  url.includes('youtube.com') || url.includes('youtu.be');

const isCloudinaryVideo = (url) =>
  url.includes('cloudinary.com') || url.includes('/video/upload/');

const toYouTubeEmbedUrl = (url) => {
  try {
    if (url.includes('youtu.be/')) {
      const id = url.split('youtu.be/')[1]?.split(/[?&]/)[0];
      return id ? `https://www.youtube.com/embed/${id}` : url;
    }

    const parsedUrl = new URL(url);
    const videoId = parsedUrl.searchParams.get('v');
    return videoId ? `https://www.youtube.com/embed/${videoId}` : url;
  } catch (error) {
    return url;
  }
};

const renderPlaceholder = (title) => (
  <div className="flex h-full w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-300 bg-slate-100 px-6 text-center text-slate-500">
    <PlayCircle className="h-12 w-12 text-slate-400" aria-hidden="true" />
    <div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="mt-1 text-sm">Video tutorial proximamente.</p>
    </div>
  </div>
);

const VideoPlayer = ({ cloudinaryVideoUrl, title }) => {
  const normalizedUrl = typeof cloudinaryVideoUrl === 'string' ? cloudinaryVideoUrl.trim() : '';

  return (
    <div
      className="help-video-container overflow-hidden rounded-2xl"
      style={{ aspectRatio: '16 / 9' }}
    >
      {!normalizedUrl
        ? renderPlaceholder(title)
        : isYouTubeUrl(normalizedUrl)
          ? (
            <iframe
              className="h-full w-full rounded-xl border-0"
              src={toYouTubeEmbedUrl(normalizedUrl)}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
            )
          : isDirectVideo(normalizedUrl) || isCloudinaryVideo(normalizedUrl)
            ? (
              <video
                controls
                className="h-full w-full rounded-xl object-cover"
                src={normalizedUrl}
                aria-label={title}
              />
              )
            : renderPlaceholder(title)}
    </div>
  );
};

export default VideoPlayer;
