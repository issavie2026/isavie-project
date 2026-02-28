import { Router } from 'express';
import { prisma } from '../lib/db.js';
import { requireAuth } from '../middleware/auth.js';
import { requireMember, requireOrganizerOrCo } from '../middleware/rbac.js';
import { notifyTripMembers } from '../lib/notifications.js';

const router = Router({ mergeParams: true });

function getTripId(req) {
  return req.params.tripId;
}

function normalizeObjectJson(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return '{}';
  return JSON.stringify(value);
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
          travelDetails: '{}',
          documentsInfo: '{}',
          safetyHealth: '{}',
          localInfo: '{}',
          planningInfo: '{}',
          personalInfo: '{}',
          groupFeatures: '{}',
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
    const {
      meeting_points,
      house_rules,
      emergency_contacts,
      hotel_information,
      flight_information,
      destination_rules,
      lodging_details,
      key_links,
      packing_list,
      travel_details,
      documents_info,
      safety_health,
      local_info,
      planning_info,
      personal_info,
      group_features,
    } = req.body ?? {};
    const data = {};
    if (meeting_points !== undefined) data.meetingPoints = JSON.stringify(Array.isArray(meeting_points) ? meeting_points : []);
    if (house_rules !== undefined) data.houseRules = house_rules == null ? null : String(house_rules).trim() || null;
    if (emergency_contacts !== undefined) data.emergencyContacts = JSON.stringify(Array.isArray(emergency_contacts) ? emergency_contacts : []);
    if (hotel_information !== undefined) data.hotelInfo = hotel_information == null ? null : String(hotel_information).trim() || null;
    if (flight_information !== undefined) data.flightInfo = flight_information == null ? null : String(flight_information).trim() || null;
    if (destination_rules !== undefined) data.destinationRules = destination_rules == null ? null : String(destination_rules).trim() || null;
    if (lodging_details !== undefined) data.lodgingDetails = lodging_details == null ? null : String(lodging_details).trim() || null;
    if (key_links !== undefined) data.keyLinks = JSON.stringify(Array.isArray(key_links) ? key_links : []);
    if (packing_list !== undefined) data.packingList = JSON.stringify(Array.isArray(packing_list) ? packing_list : []);
    if (travel_details !== undefined) data.travelDetails = normalizeObjectJson(travel_details);
    if (documents_info !== undefined) data.documentsInfo = normalizeObjectJson(documents_info);
    if (safety_health !== undefined) data.safetyHealth = normalizeObjectJson(safety_health);
    if (local_info !== undefined) data.localInfo = normalizeObjectJson(local_info);
    if (planning_info !== undefined) data.planningInfo = normalizeObjectJson(planning_info);
    if (personal_info !== undefined) data.personalInfo = normalizeObjectJson(personal_info);
    if (group_features !== undefined) data.groupFeatures = normalizeObjectJson(group_features);

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
          travelDetails: data.travelDetails ?? '{}',
          documentsInfo: data.documentsInfo ?? '{}',
          safetyHealth: data.safetyHealth ?? '{}',
          localInfo: data.localInfo ?? '{}',
          planningInfo: data.planningInfo ?? '{}',
          personalInfo: data.personalInfo ?? '{}',
          groupFeatures: data.groupFeatures ?? '{}',
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
