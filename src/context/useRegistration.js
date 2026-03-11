import { useState } from 'react';

const STORAGE_KEY = 'ads_acc_registered';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwpHgIPoWm3dt84iAQJ2qHnas47XyT-IYn_CWtnUdoDevihRUA7mInP7eF31R8UFnEq/exec';

/**
 * useRegistration — Shared registration gate hook.
 *
 * Checks localStorage for a registration flag. Once a user registers
 * (from any tool), they are never shown the popup again on this browser.
 *
 * Returns:
 *   isRegistered  — true if the user has already registered
 *   markRegistered(firstName, lastName, email) — saves flag + submits to Google Sheets
 */
const useRegistration = () => {
    const [isRegistered, setIsRegistered] = useState(() => {
        try {
            return localStorage.getItem(STORAGE_KEY) === 'true';
        } catch {
            return false;
        }
    });

    const markRegistered = async (firstName, lastName, email, toolSlug = 'tool-popup') => {
        // 1. Save to localStorage immediately so UX is instant
        try {
            localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
            // Private browsing may block this — fail silently
        }
        setIsRegistered(true);

        // 2. Submit to Google Sheets (fire-and-forget, same as useLeadForm)
        try {
            const scriptUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEB_APP_URL || GOOGLE_SHEETS_URL;
            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ firstName, lastName, email, tool_requested: toolSlug }),
            });
        } catch (err) {
            console.error('Registration submission error:', err);
        }
    };

    return { isRegistered, markRegistered };
};

export default useRegistration;
