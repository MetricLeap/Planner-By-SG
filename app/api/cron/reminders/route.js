import { supabase } from '../../../../lib/supabase';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

const memberNames = {
    mom: 'Mama',
    dad: 'Tata',
    child1: 'Córka 1',
    child2: 'Córka 2',
    all: 'Cała rodzina'
};

export async function GET(request) {
    try {
        // Wyliczenie jutrzejszej daty w formacie YYYY-MM-DD
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const tomorrowStr = tomorrow.toISOString().split('T')[0];

        // Pobranie wizyt zaplanowanych na jutro
        const { data: visits, error } = await supabase
            .from('visits')
            .select('*')
            .eq('date', tomorrowStr);

        if (error) throw error;

        if (!visits || visits.length === 0) {
            return Response.json({ message: 'Brak wizyt na jutro.' });
        }

        // Wysyłka przypomnienia dla każdej znalezionej wizyty
        for (const visit of visits) {
            const formattedCost = !visit.cost || visit.cost === 0 ? '0 zł' : `${visit.cost} zł`;

            await resend.emails.send({
                from: 'Planner By SG <onboarding@resend.dev>',
                to: ['s.gasior97@gmail.com', 'natkatatsenko@gmail.com'],
                subject: `[PRZYPOMNIENIE] Jutrzejsza wizyta: ${visit.doctor}`,
                html: `
          <div style="font-family: sans-serif; padding: 20px; color: #333;">
            <h2 style="color: #d97706;">Przypomnienie o jutrzejszej wizycie!</h2>
            <p><strong>Dla kogo:</strong> ${memberNames[visit.member_key] || visit.member_key}</p>
            <p><strong>Wydarzenie:</strong> ${visit.doctor}</p>
            <p><strong>Godzina:</strong> ${visit.time}</p>
            ${visit.location ? `<p><strong>Miejsce:</strong> ${visit.location}</p>` : ''}
            <p><strong>Koszt:</strong> ${formattedCost}</p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />
            <p style="font-size: 12px; color: #666;">Powiadomienie z cyklicznego automatycznego systemu Planner By SG.</p>
          </div>
        `,
            });
        }

        return Response.json({ success: true, count: visits.length });
    } catch (err) {
        return Response.json({ error: err.message }, { status: 500 });
    }
}