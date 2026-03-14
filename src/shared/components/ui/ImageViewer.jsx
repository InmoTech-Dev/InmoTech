import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, Download, ZoomIn } from 'lucide-react';

export function ImageViewer({
    isOpen,
    onClose,
    images = [],
    currentIndex = 0,
    onIndexChange
}) {
    if (!isOpen || images.length === 0) return null;

    const currentImage = images[currentIndex];
    const hasMultiple = images.length > 1;

    const handlePrevious = (e) => {
        e.stopPropagation();
        if (onIndexChange) {
            const nextIndex = (currentIndex - 1 + images.length) % images.length;
            onIndexChange(nextIndex);
        }
    };

    const handleNext = (e) => {
        e.stopPropagation();
        if (onIndexChange) {
            const nextIndex = (currentIndex + 1) % images.length;
            onIndexChange(nextIndex);
        }
    };

    const handleDownload = (e) => {
        e.stopPropagation();
        const link = document.createElement('a');
        link.href = currentImage.url;
        link.download = currentImage.name || `imagen-${currentIndex + 1}`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/95 backdrop-blur-sm p-4 md:p-10"
                onClick={onClose}
            >
                {/* Controls Overlay */}
                <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between z-10 pointer-events-none">
                    <div className="flex items-center gap-3 pointer-events-auto">
                        <div className="bg-white/10 backdrop-blur-md rounded-full px-4 py-1.5 border border-white/20">
                            <span className="text-white text-sm font-semibold tracking-wider">
                                {currentIndex + 1} / {images.length}
                            </span>
                        </div>
                        {currentImage.name && (
                            <span className="text-white/70 text-xs font-medium truncate max-w-[200px] hidden sm:block">
                                {currentImage.name}
                            </span>
                        )}
                    </div>

                    <div className="flex items-center gap-2 pointer-events-auto">
                        <button
                            onClick={handleDownload}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
                            title="Descargar imagen"
                        >
                            <Download className="w-5 h-5" />
                        </button>
                        <button
                            onClick={onClose}
                            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all border border-white/10"
                            title="Cerrar"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Navigation - Previous */}
                {hasMultiple && (
                    <button
                        onClick={handlePrevious}
                        className="absolute left-4 md:left-10 z-10 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/5 group hidden md:block"
                    >
                        <ChevronLeft className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                )}

                {/* Image Container */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.9, opacity: 0 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    className="relative max-w-full max-h-full flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                >
                    <img
                        src={currentImage.url}
                        alt={currentImage.name || `Imagen ${currentIndex + 1}`}
                        className="max-w-[95vw] max-h-[88vh] object-contain rounded-2xl shadow-2xl select-none"
                    />
                </motion.div>

                {/* Navigation - Next */}
                {hasMultiple && (
                    <button
                        onClick={handleNext}
                        className="absolute right-4 md:right-10 z-10 p-3 bg-white/5 hover:bg-white/10 text-white rounded-full transition-all border border-white/5 group hidden md:block"
                    >
                        <ChevronRight className="w-8 h-8 group-hover:scale-110 transition-transform" />
                    </button>
                )}

                {/* Mobile Swipe Simulation / Taps */}
                <div className="absolute inset-y-0 left-0 w-20 md:hidden" onClick={handlePrevious} />
                <div className="absolute inset-y-0 right-0 w-20 md:hidden" onClick={handleNext} />
            </motion.div>
        </AnimatePresence>
    );
}
