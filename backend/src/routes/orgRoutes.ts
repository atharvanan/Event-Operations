import { Router } from 'express';
import { createOrg, getMyOrgs, getOrgMembers, inviteMember } from '../controllers/orgController.js';
import { authenticate, requireOrgRole } from '../middlewares/auth.js';
import { OrgRole } from '../constants/index.js';

const router = Router();

router.use(authenticate);

router.post('/', createOrg);
router.get('/', getMyOrgs);
router.get('/:orgId/members', requireOrgRole([OrgRole.OWNER, OrgRole.ADMIN, OrgRole.MEMBER]), getOrgMembers);
router.post('/:orgId/invite', requireOrgRole([OrgRole.OWNER, OrgRole.ADMIN]), inviteMember);

export default router;
