import React, { useEffect, useState } from 'react';
import { motion, useAnimation, useInView } from 'framer-motion';

// Quick utility reusable component for counting numbers up when scrolled into view
const CountUpAnimation = ({ targetNumber, duration = 2, prefix = "", suffix = "" }) => {
    const [count, setCount] = useState(0);
    const ref = React.useRef(null);
    const isInView = useInView(ref, { once: true, margin: "-50px" });

    useEffect(() => {
        if (isInView) {
            let start = 0;
            const end = parseInt(targetNumber, 10);
            if (start === end) return;

            const incrementTime = (duration * 1000) / end;

            // If the number is huge (100M+), we don't want to calculate 1 by 1 slowly.
            // We use a smooth requestAnimationFrame approach instead of setInterval for performance.
            let startTime;
            const step = (timestamp) => {
                if (!startTime) startTime = timestamp;
                const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);

                // easeOutQuart
                const easeOut = 1 - Math.pow(1 - progress, 4);

                setCount(Math.floor(easeOut * end));
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    setCount(end); // force exact end
                }
            };
            window.requestAnimationFrame(step);
        }
    }, [isInView, targetNumber, duration]);

    return (
        <span ref={ref}>
            {prefix}{count}{suffix}
        </span>
    );
};

export default CountUpAnimation;
