import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import './CustomCursor.css';

const CustomCursor = () => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isHovering, setIsHovering] = useState(false);
    const location = useLocation();

    // Only active on the root landing page
    const isLandingPage = location.pathname === '/';

    useEffect(() => {
        if (!isLandingPage) {
            document.body.classList.remove('custom-cursor-active');
            return;
        }

        document.body.classList.add('custom-cursor-active');

        const updatePosition = (e) => {
            setPosition({ x: e.clientX, y: e.clientY });
        };

        const handleMouseOver = (e) => {
            const target = e.target;
            // Check if hovering over a clickable element
            if (
                target.tagName.toLowerCase() === 'button' ||
                target.tagName.toLowerCase() === 'a' ||
                target.closest('button') ||
                target.closest('a') ||
                target.classList.contains('clickable')
            ) {
                setIsHovering(true);
            } else {
                setIsHovering(false);
            }
        };

        window.addEventListener('mousemove', updatePosition);
        window.addEventListener('mouseover', handleMouseOver);

        return () => {
            window.removeEventListener('mousemove', updatePosition);
            window.removeEventListener('mouseover', handleMouseOver);
            document.body.classList.remove('custom-cursor-active');
        };
    }, [isLandingPage]);

    if (!isLandingPage) return null;

    return (
        <div
            className={`custom-cursor ${isHovering ? 'hover' : ''}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
            }}
        />
    );
};

export default CustomCursor;
