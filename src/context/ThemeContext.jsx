import React, { createContext, useContext, useEffect, useState } from 'react';

const ThemeContext = createContext();

export const useTheme = () => useContext(ThemeContext);

export const ThemeProvider = ({ children }) => {
    // Default to Light Mode
    const [isDarkMode, setIsDarkMode] = useState(false);

    // Toggle theme function
    const toggleTheme = () => {
        setIsDarkMode(!isDarkMode);
    };

    // Apply theme to body and html (for global scrollbar targeting)
    useEffect(() => {
        if (isDarkMode) {
            document.body.classList.remove('light-mode');
            document.documentElement.classList.remove('light-mode');
        } else {
            document.body.classList.add('light-mode');
            document.documentElement.classList.add('light-mode');
        }
    }, [isDarkMode]);

    return (
        <ThemeContext.Provider value={{ isDarkMode, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
};
