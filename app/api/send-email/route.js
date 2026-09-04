import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
    try {
        const { doctor, memberName, date, time, location, cost, type } = await req.json();

        const isDelete = type === 'delete';
        const subject = isDelete
            ? `Usunięto wydarzenie: ${doctor} (${memberName})`
            : `Nowe wydarzenie: ${doctor} (${memberName})`;

        const headingText = isDelete ? 'Wydarzenie zostało usunięte' : 'Zaplanowano nowe wydarzenie!';
        const costDisplay = cost && parseFloat(cost) > 0 ? `${cost} zł` : 'Bezpłatnie / 0 zł';

        const data = await resend.emails.send({
            from: 'Planner By SG<powiadomienia@plannerbysg.pl>',
            to: ['s.gasior97@gmail.com'], // Zmień na swój adres docelowy
            subject: subject,
            html: `
        <div style="font-family: sans-serif; padding: 20px; line-height: 1.5;">
          <h2 style="color: ${isDelete ? '#dc2626' : '#2563eb'};">${headingText}</h2>
          <ul>
            <li><strong>Uczestnik:</strong> ${memberName}</li>
            <li><strong>Wydarzenie / Lekarz:</strong> ${doctor}</li>
            <li><strong>Data:</strong> ${date}</li>
            <li><strong>Godzina:</strong> ${time}</li>
            <li><strong>Miejsce:</strong> ${location || 'Nie podano'}</li>
            ${!isDelete ? `<li><strong>Koszt:</strong> ${costDisplay}</li>` : ''}
          </ul>
        </div>
      `,
        });

        return Response.json(data);
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}