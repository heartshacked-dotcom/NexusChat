
import React from 'react';

interface ImageViewerProps {
  src: string;
  alt?: string;
  onClose: () => void;
}

export const ImageViewer: React.FC<ImageViewerProps> = ({ src, alt, onClose }) => {
  return (
    <div className="fixed inset-0 z-[60] bg-black/95 flex items-center justify-center p-4 animate-fade-in" onClick={onClose}>
      <button 
        onClick={onClose} 
        className="absolute top-4 right-4 p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition"
      >
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
      
      <img 
        src={src} 
        alt={alt || "Full screen preview"} 
        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl animate-pop-in"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking the image
      />
    </div>
  );
};
