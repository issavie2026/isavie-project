import { Router } from 'express';
import PDFDocument from 'pdfkit';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember } from '../middleware/rbac.js';
import { notFound } from '../middleware/error.js';

const router = Router({ mergeParams: true });

function getTripId(req) {
  return req.params.tripId;
}

// Synchronous export; for long trips consider async job (202 + poll or webhook) to avoid timeouts.
router.post('/itinerary.pdf', requireAuth, requireMember, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const trip = await prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        days: {
          orderBy: [{ date: 'asc' }, { position: 'asc' }],
          include: { items: true },
        },
      },
    });
    if (!trip) throw notFound('Trip not found');
    const tbd = (a, b) => {
      const au = !a.startTime || a.startTime === 'TBD';
      const bu = !b.startTime || b.startTime === 'TBD';
      if (au && !bu) return 1;
      if (!au && bu) return -1;
      return (a.startTime || '').localeCompare(b.startTime || '') || a.title.localeCompare(b.title);
    };
    trip.days.forEach((d) => d.items.sort(tbd));

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="issavie-${trip.name.replace(/[^a-z0-9]/gi, '-')}-itinerary.pdf"`);

    const doc = new PDFDocument({ margin: 50 });
    doc.pipe(res);

    doc.fontSize(20).text(trip.name, { align: 'center' });
    doc.fontSize(12).text(`${trip.destination} • ${trip.startDate.toISOString().slice(0, 10)} – ${trip.endDate.toISOString().slice(0, 10)}`, { align: 'center' });
    doc.moveDown(1.5);

    for (const day of trip.days) {
      const dateStr = day.date instanceof Date ? day.date.toISOString().slice(0, 10) : String(day.date).slice(0, 10);
      doc.fontSize(16).text(`Day: ${dateStr}`, { continued: false });
      doc.moveDown(0.5);
      for (const item of day.items) {
        doc.fontSize(12).text(item.title, { continued: false });
        const timeStr = item.startTime || item.endTime ? [item.startTime || 'TBD', item.endTime].filter(Boolean).join(' – ') : 'TBD';
        doc.fontSize(10).fillColor('gray').text(`  ${timeStr}`, { continued: false });
        if (item.locationText) doc.fontSize(10).text(`  📍 ${item.locationText}`, { continued: false });
        if (item.notes) doc.fontSize(10).text(`  ${item.notes}`, { continued: false });
        try {
          const links = JSON.parse(item.externalLinks || '[]');
          if (Array.isArray(links) && links.length) {
            links.forEach((l) => {
              const href = typeof l === 'string' ? l : (l?.url || l?.href);
              if (href) doc.fontSize(9).fillColor('blue').text(`  Link: ${href}`, { link: href, continued: false });
            });
          }
        } catch (_) {}
        doc.fillColor('black').moveDown(0.3);
      }
      doc.moveDown(1);
    }

    doc.end();
  } catch (e) {
    next(e);
  }
});

export const exportRouter = router;
