import { useState } from 'react';

// Single key for all access — stores a 24 h expiry timestamp regardless of
// whether the user fully registered or just dismissed the modal.
const ACCESS_KEY = 'ads_acc_access_expiry';
const GOOGLE_SHEETS_URL = 'https://script.google.com/macros/s/AKfycbwpHgIPoWm3dt84iAQJ2qHnas47XyT-IYn_CWtnUdoDevihRUA7mInP7eF31R8UFnEq/exec';

const TWENTY_FOUR_HOURS = 24 * 60 * 60 * 1000;

/**
 * useRegistration — Shared registration gate hook.
 *
 * Access is always time-limited to 24 hours, whether the user filled in the
 * form or just dismissed the modal. After 24 h they will be prompted again.
 *
 * Returns:
 *   isRegistered        — true if within a valid 24 h access window
 *   markRegistered(...)  — grants 24 h + submits to Google Sheets
 *   markTempAllow()      — grants 24 h grace (called when modal is dismissed)
 */

const checkAccess = () => {
    try {
        const expiry = localStorage.getItem(ACCESS_KEY);
        if (expiry && Date.now() < parseInt(expiry, 10)) return true;
    } catch { /* private browsing */ }
    return false;
};

const grantAccess = () => {
    try {
        localStorage.setItem(ACCESS_KEY, (Date.now() + TWENTY_FOUR_HOURS).toString());
    } catch { /* fail silently */ }
};

const useRegistration = () => {
    const [isRegistered, setIsRegistered] = useState(checkAccess);

    /** Full registration — grants 24 h + submits to Google Sheets */
    const markRegistered = async (firstName, lastName, email, toolSlug = 'tool-popup') => {
        grantAccess();
        setIsRegistered(true);

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
