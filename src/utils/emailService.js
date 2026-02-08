/**
 * Sends an email notification via the Vercel/Resend API endpoint.
 * @param {string} email - Recipient email (currently ignored by backend in test mode).
 * @param {string} subject - Email subject.
 * @param {string} html - HTML content of the email.
 * @returns {Promise<any>} - The response data from the API.
 */
export const sendEmailNotification = async (email, subject, html) => {
    try {
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email,
                subject,
                html
            }),
        })

        if (!response.ok) {
            const errorData = await response.json()
            throw new Error(errorData.error || 'Error sending email')
        }

        return await response.json()
    } catch (error) {
        console.error('Email Service Error:', error)
        throw error
    }
}
