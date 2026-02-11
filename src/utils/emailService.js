/**
 * Servicio para enviar correos a través de nuestra Serverless Function (api/send-email.js)
 * @param {string} toEmail - Correo del destinatario
 * @param {string} subject - Asunto del correo
 * @param {string} htmlContent - Cuerpo del correo en formato HTML
 */
export const sendEmailNotification = async (toEmail, subject, htmlContent) => {
    if (!toEmail) {
        console.warn('⚠️ No se proporcionó email para enviar la notificación.');
        return false;
    }
    try {
        // Hacemos la petición a nuestra API interna
        const response = await fetch('/api/send-email', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: toEmail,
                subject: subject,
                html: htmlContent
            }),
        });

        const result = await response.json();
        if (!response.ok) {
            throw new Error(result.error || 'Error desconocido en el servidor de correo');
        }
        console.log('✅ Correo enviado con éxito:', result);
        return true;
    } catch (error) {
        console.error('❌ Error crítico enviando email:', error);
        // Retornamos false pero NO lanzamos error para no romper la experiencia del usuario
        return false;
    }
};
