import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    try {
        const body = await request.json();
        const { action, doctor, date, time, memberKey, location, notes, cost } = body;

        let subject = '';
        let htmlContent = '';
        const costFormatted = !cost || cost === 0 ? '0 zł' : `${cost} zł`;

        switch (action) {
            case 'created':
                subject = `Nowe wydarzenie: ${doctor}`;
                htmlContent = `
                    <h2 style="color: #2563eb;">Zaplanowano nowe wydarzenie</h2>
                    <p><strong>Wydarzenie:</strong> ${doctor}</p>
                    <p><strong>Data:</strong> ${date} (${time})</p>
                    <p><strong>Uczestnik:</strong> ${memberKey}</p>
                    <p><strong>Koszt:</strong> ${costFormatted}</p>
                    ${location ? `<p><strong>Miejsce:</strong> ${location}</p>` : ''}
                    ${notes ? `<p><strong>Notatka:</strong> ${notes}</p>` : ''}
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Powiadomienie z cyklicznego automatycznego systemu Planner By SG.</p>
            <p style="font-size: 12px; color: #666;">https://plannerbysg.pl | All rights reserved by Sebastian Gąsior</p>
                `;
                break;

            case 'updated':
                subject = `Zaktualizowano wydarzenie: ${doctor}`;
                htmlContent = `
                    <h2 style="color: #d97706;">Zaktualizowano wydarzenie</h2>
                    <p><strong>Wydarzenie:</strong> ${doctor}</p>
                    <p><strong>Nowa data:</strong> ${date} (${time})</p>
                    <p><strong>Uczestnik:</strong> ${memberKey}</p>
                    <p><strong>Koszt:</strong> ${costFormatted}</p>
                    ${location ? `<p><strong>Miejsce:</strong> ${location}</p>` : ''}
                    ${notes ? `<p><strong>Notatka:</strong> ${notes}</p>` : ''}
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Powiadomienie z cyklicznego automatycznego systemu Planner By SG.</p>
            <p style="font-size: 12px; color: #666;">https://plannerbysg.pl | All rights reserved by Sebastian Gąsior</p>
                `;
                break;

            case 'deleted':
                subject = `Usunięto wydarzenie: ${doctor}`;
                htmlContent = `
                    <h2 style="color: #dc2626;">Usunięto wydarzenie</h2>
                    <p><strong>Wydarzenie:</strong> ${doctor}</p>
                    <p><strong>Termin:</strong> ${date} (${time})</p>
                    <p><strong>Uczestnik:</strong> ${memberKey}</p>
                    <p><strong>Koszt:</strong> ${costFormatted}</p>
                    <p>To wydarzenie zostało usunięte z terminarza.</p>
                    <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Powiadomienie z cyklicznego automatycznego systemu Planner By SG.</p>
            <p style="font-size: 12px; color: #666;">https://plannerbysg.pl | All rights reserved by Sebastian Gąsior</p>
                `;
                break;

            default:
                throw new Error('Nieznana akcja');
        }

        const data = await resend.emails.send({
            from: 'Planner By SG <powiadomienia@plannerbysg.pl>', // Zmień na zweryfikowaną domenę, gdy będzie gotowa
            to: ['s.gasior97@gmail.com'], // Adres, na który mają przychodzić powiadomienia
            subject: subject,
            html: htmlContent,
        });

        return NextResponse.json({ success: true, data });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}