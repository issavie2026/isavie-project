import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember, requireOrganizerOrCo } from '../middleware/rbac.js';
import { notifyTripMembers } from '../lib/notifications.js';

const router = Router({ mergeParams: true });

function getTripId(req) {
  return req.params.tripId;
}

router.get('/', requireAuth, requireMember, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    let essentials = await prisma.tripEssentials.findUnique({
      where: { tripId },
    });
    if (!essentials) {
      essentials = await prisma.tripEssentials.create({
        data: {
          tripId,
          meetingPoints: '[]',
          emergencyContacts: '[]',
          keyLinks: '[]',
          packingList: '[]',
        },
      });
    }
    res.json(essentials);
  } catch (e) {
    next(e);
  }
});

router.patch('/', requireAuth, requireMember, requireOrganizerOrCo, async (req, res, next) => {
  try {
    const tripId = getTripId(req);
    const { meeting_points, house_rules, emergency_contacts, lodging_details, key_links, packing_list } = req.body ?? {};
    const data = {};
    if (meeting_points !== undefined) data.meetingPoints = JSON.stringify(Array.isArray(meeting_points) ? meeting_points : []);
    if (house_rules !== undefined) data.houseRules = house_rules == null ? null : String(house_rules).trim() || null;
    if (emergency_contacts !== undefined) data.emergencyContacts = JSON.stringify(Array.isArray(emergency_contacts) ? emergency_contacts : []);
    if (lodging_details !== undefined) data.lodgingDetails = lodging_details == null ? null : String(lodging_details).trim() || null;
    if (key_links !== undefined) data.keyLinks = JSON.stringify(Array.isArray(key_links) ? key_links : []);
    if (packing_list !== undefined) data.packingList = JSON.stringify(Array.isArray(packing_list) ? packing_list : []);

    let essentials = await prisma.tripEssentials.findUnique({ where: { tripId } });
    if (!essentials) {
      essentials = await prisma.tripEssentials.create({
        data: {
          tripId,
          ...data,
          meetingPoints: data.meetingPoints ?? '[]',
          emergencyContacts: data.emergencyContacts ?? '[]',
          keyLinks: data.keyLinks ?? '[]',
          packingList: data.packingList ?? '[]',
        },
      });
    } else {
      essentials = await prisma.tripEssentials.update({
        where: { tripId },
        data,
      });
    }
    await notifyTripMembers(tripId, req.userId, 'essentials_updated', {});
    res.json(essentials);
  } catch (e) {
    next(e);
  }
});

export const essentialsRouter = router;
