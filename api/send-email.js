import { Resend } from 'resend';

const resend = new Resend(process.env.API_KEY_RESEND);

export default async function handler(req, res) {
    // Configuración CORS (Permite que tu frontend hable con esta función)
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    // Responder a preflight requests
    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    try {
        const { email, subject, html } = req.body;

        // Validación
        if (!email || !subject || !html) {
            return res.status(400).json({ error: 'Faltan datos: email, subject o html' });
        }

        // Envío Seguro
        const data = await resend.emails.send({
            from: 'LinoLab System <onboarding@resend.dev>',
            to: [email], // En modo prueba de Resend, esto solo llegará a tu correo verificado
            subject: subject,
            html: html,
        });

        return res.status(200).json(data);
    } catch (error) {
        console.error('Error API Resend:', error);
        return res.status(500).json({ error: error.message });
    }
}
