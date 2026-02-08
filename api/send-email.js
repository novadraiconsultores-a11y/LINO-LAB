import { Resend } from 'resend';

// Inicializar con la variable de entorno EXACTA del usuario
const resend = new Resend(process.env.API_KEY_RESEND);

export default async function handler(req, res) {
    // Habilitar CORS para que funcione desde el frontend
    res.setHeader('Access-Control-Allow-Credentials', true);
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
    res.setHeader(
        'Access-Control-Allow-Headers',
        'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
    );

    if (req.method === 'OPTIONS') {
        res.status(200).end();
        return;
    }

    try {
        const { email, subject, html } = req.body;

        const data = await resend.emails.send({
            from: 'onboarding@resend.dev', // MODO PRUEBA: Solo funciona así por ahora
            to: 'novadrai.consultores@gmail.com', // HARDCODED: En modo prueba solo puedes enviarte a ti mismo
            subject: subject || 'Notificación LinoLab',
            html: html || '<p>Alerta del sistema</p>',
        });

        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
}
