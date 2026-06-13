import { useState } from "react";

interface ImageWithFallbackProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  fallback?: string;
}

export function ImageWithFallback({ fallback, alt, ...props }: ImageWithFallbackProps) {
  const [error, setError] = useState(false);

  if (error) {
    return (
      <div
        className="flex items-center justify-center bg-muted text-muted-foreground font-mono text-xs"
        style={{ width: props.width || "100%", height: props.height || "100%" }}
      >
        {fallback || "?"}
      </div>
    );
  }

  return (
    <img
      {...props}
      alt={alt}
      onError={() => setError(true)}
    />
  );
}
