import React, { useState, useRef, useCallback, useEffect } from 'react';

interface ResizablePanelProps {
    children: [React.ReactNode, React.ReactNode];
    direction: 'vertical' | 'horizontal';
    initialSize?: number;
    initialSizeRatio?: number;
    minSize?: number;
    minSizeSecondary?: number;
    className?: string;
}

const ResizablePanel: React.FC<ResizablePanelProps> = ({ children, direction, initialSize, initialSizeRatio, minSize = 50, minSizeSecondary = 50, className }) => {
    const [size, setSize] = useState<number | undefined>(initialSize);
    const containerRef = useRef<HTMLDivElement>(null);
    const isResizing = useRef(false);

    useEffect(() => {
        // This effect sets the initial size based on a ratio when the component mounts.
        // It only runs if initialSize is not provided and initialSizeRatio is.
        if (size === undefined && initialSizeRatio && containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const totalSize = direction === 'vertical' ? rect.width : rect.height;
            if (totalSize > 0) {
                 setSize(totalSize * initialSizeRatio);
            }
        }
    }, [size, initialSizeRatio, direction]);


    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!isResizing.current || !containerRef.current) return;
        
        e.preventDefault();

        // Use rAF for performance
        requestAnimationFrame(() => {
            if (!containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            let newSize;
            let maxSize;

            if (direction === 'vertical') {
                newSize = e.clientX - rect.left;
                maxSize = rect.width - minSizeSecondary;
            } else { // horizontal
                newSize = e.clientY - rect.top;
                maxSize = rect.height - minSizeSecondary;
            }
            
            const constrainedSize = Math.max(minSize, Math.min(newSize, maxSize));
            setSize(constrainedSize);
        });
    }, [direction, minSize, minSizeSecondary]);
    
    const handleMouseUp = useCallback(() => {
        isResizing.current = false;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
    }, [handleMouseMove]);

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isResizing.current = true;
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = direction === 'vertical' ? 'ew-resize' : 'ns-resize';
        document.body.style.userSelect = 'none';
    };
    
    // Cleanup on unmount
    useEffect(() => {
        return () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }, [handleMouseMove, handleMouseUp]);


    const isVertical = direction === 'vertical';

    // Provide a fallback style if size hasn't been determined yet to avoid panel collapse
    const panelStyle = {
        [isVertical ? 'width' : 'height']: size !== undefined ? `${size}px` : (initialSizeRatio ? `${initialSizeRatio * 100}%` : '50%')
    };

    return (
        <div
            ref={containerRef}
            className={`flex h-full w-full overflow-hidden ${isVertical ? 'flex-row' : 'flex-col'} ${className ?? ''}`}
        >
            <div style={panelStyle} className="flex-shrink-0 overflow-hidden relative">
                {children[0]}
            </div>
            <div
                onMouseDown={handleMouseDown}
                className={`flex-shrink-0 bg-slate-700 hover:bg-cyan-500 active:bg-cyan-400 transition-colors duration-200 z-10 ${isVertical ? 'w-1 cursor-ew-resize' : 'h-1 cursor-ns-resize'}`}
            />
            <div className="flex-grow overflow-hidden relative min-w-0 min-h-0">
                {children[1]}
            </div>
        </div>
    );
};

export default ResizablePanel;