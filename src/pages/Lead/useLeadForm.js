import { useState } from 'react';

// A simple tool to check if the email actually looks like an email (e.g., has an @ and a .)
const isValidEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

/**
 * useLeadForm hook - The brains behind the Email Capture form.
 * 
 * WHAT DOES THIS DO?
 * This file handles all the logic: typing the email, checking if it's valid, 
 * sending it, and keeping track of whether we are 'loading' or 'successful'.
 * 
 * WHERE DO THE EMAILS GO RIGHT NOW?
 * Nowhere yet! Right now, this uses a "Mock API" (fake sender). When you click submit, 
 * it just waits 1.5 seconds to simulate a real loading bar, and then pretends it succeeded.
 * This is perfect for testing the design.
 * 
 * HOW DO I CONNECT IT TO MY REAL EMAIL SERVICE (Mailchimp, ConvertKit, etc.)?
 * 1. Find the "mockSubmit" function below.
 * 2. Delete it.
 * 3. Replace it with a "fetch" request to your backend or service. (See example below)
 */
const useLeadForm = (toolSlug = 'free-tool') => {
    // 1. Keep track of what the user is typing into the input boxes
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');

    // Checkbox for Terms and Conditions
    const [acceptedTerms, setAcceptedTerms] = useState(false);

    // 2. Keep track of what the button should be doing:
    // 'idle' = waiting for click
    // 'loading' = spinning wheel
    // 'success' = show the checkmark page
    // 'exists' = show the return visitor page
    // 'error' = show an error message
    const [status, setStatus] = useState('idle');
    const [visitCount, setVisitCount] = useState(1);

    // 3. Keep track of error messages to show the user
    const [errorMessage, setErrorMessage] = useState('');

    // =========================================================================
    // 🛑 THIS IS THE PART YOU WILL CHANGE WHEN YOU GO LIVE 🛑
    // =========================================================================

    // THE REAL SENDER:
    // Sends the data directly to Google Apps Script. 
    // We use a POST request with 'no-cors' to completely bypass Google's strict redirect policies.
    const submitToGoogleSheets = async (firstName, lastName, email) => {
        const scriptUrl = import.meta.env.VITE_GOOGLE_SHEETS_WEB_APP_URL || 'https://script.google.com/macros/s/AKfycbwpHgIPoWm3dt84iAQJ2qHnas47XyT-IYn_CWtnUdoDevihRUA7mInP7eF31R8UFnEq/exec';

        try {
            await fetch(scriptUrl, {
                method: 'POST',
                mode: 'no-cors', // Bypasses the redirect CORS errors entirely
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    tool_requested: toolSlug
                })
            });

            // Because of no-cors, we get an opaque response back (we can't read the JSON).
            // As long as the fetch didn't throw a network error, we assume it reached the endpoint.
            return { status: 'success' };
        } catch (error) {
            console.error("Error submitting to Google Sheets:", error);
            throw error;
        }
    };
    // =========================================================================

    // This is the function that runs the moment the user clicks the "Submit" button
    const handleSubmit = async (e) => {
        e.preventDefault(); // Stops the page from refreshing automatically
        setErrorMessage(''); // Clear out any old errors

        // Check 1: Did they fill out their name?
        if (!firstName.trim()) {
            setErrorMessage('Please enter your first name.');
            return;
        }
        if (!lastName.trim()) {
            setErrorMessage('Please enter your last name.');
            return;
        }

        // Check 2: Did they leave the email box completely empty?
        if (!email.trim()) {
            setErrorMessage('Please enter your email address.');
            return;
        }

        // Check 3: Is it missing an @ symbol or a .com?
        if (!isValidEmail(email)) {
            setErrorMessage('Please enter a valid email address.');
            return;
        }

        // Check 4: Did they accept the terms?
        if (!acceptedTerms) {
            setErrorMessage('You must accept the terms and conditions.');
            return;
        }

        // If it passes both checks, start the spinning loading wheel
        setStatus('loading');

        try {
            // ---> SEND THE LEAD DATA TO GOOGLE SHEETS <---
            const result = await submitToGoogleSheets(firstName, lastName, email);

            if (result.status === 'success') {
                setStatus('success');
            } else {
                throw new Error('Submission failed.');
            }
        } catch {
            // If the internet cut out or the server broke
            setStatus('error');
            setErrorMessage('Something went wrong. Please try again.');
        }
    };

    // This gets called if they click "Use a different email" on the success screen
    const reset = () => {
        setFirstName('');
        setLastName('');
        setEmail('');
        setAcceptedTerms(false);
        setStatus('idle');
        setErrorMessage('');
    };

    // Give all these states/functions back to the React component so it can use them
    return {
        firstName, setFirstName,
        lastName, setLastName,
        email, setEmail,
        acceptedTerms, setAcceptedTerms,
        status, visitCount, errorMessage, handleSubmit, reset
    };
};

export default useLeadForm;

