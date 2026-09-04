import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(request) {
    try {
        const { doctor, memberName, date, time, location, cost } = await request.json();

        const formattedCost = !cost || cost === 0 ? '0 zł (Bezpłatnie)' : `${cost} zł`;

        const data = await resend.emails.send({
            from: 'Planner By SG<powiadomienia@plannerbysg.pl>',
            to: ['s.gasior97@gmail.com'], // Pamiętaj o właściwym mailu
            subject: `Nowe wydarzenie: ${doctor}`,
            html: `
        <div style="font-family: sans-serif; padding: 20px; color: #333;">
          <h2 style="color: #2563eb;">Zaplanowano nowe wydarzenie w Planner By SG</h2>
          <p><strong>Dla kogo:</strong> ${memberName}</p>
          <p><strong>Wydarzenie:</strong> ${doctor}</p>
          <p><strong>Data:</strong> ${date} | <strong>Godzina:</strong> ${time}</p>
          ${location ? `<p><strong>Miejsce:</strong> ${location}</p>` : ''}
          <p><strong>Szacowany koszt:</strong> ${formattedCost}</p>
          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
          <p style="font-size: 12px; color: #666;">Wiadomość wygenerowana automatycznie przez aplikację Planner By SG.</p>
        </div>
      `,
        });

        return Response.json({ success: true, data });
    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
}