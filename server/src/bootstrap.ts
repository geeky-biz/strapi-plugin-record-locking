import type { Core } from '@strapi/strapi';
import { Server } from 'socket.io';
import pluginLogger from './utils/logger';

const bootstrap = ({ strapi }: { strapi: Core.Strapi }) => {

  const logLevel = strapi.plugin('record-locking').config('logLevel') || 'info';
  const logger = pluginLogger(logLevel);

  const io = new Server(strapi.server.httpServer);

  io.on('connection', (socket) => {
    socket.on('openEntity', async ({ entityDocumentId, entityId }) => {
      logger.debug('Received openEntity socket event.');
      const userId = strapi.admin.services.token.decodeJwtToken(socket.handshake.auth.token).payload
        .id;

      const usersPermissionsForThisContent = await strapi.db.connection
        .select('p.id', 'p.action', 'p.subject')
        .from('admin_permissions AS p')
        .innerJoin('admin_permissions_role_lnk AS prl', 'p.id', 'prl.permission_id')
        .innerJoin('admin_users_roles_lnk AS url', 'prl.role_id', 'url.role_id')
        .where('url.user_id', userId)
        .andWhere('p.subject', entityId);
      const userHasAdequatePermissions =
        usersPermissionsForThisContent.filter((perm) =>
          ['create', 'delete', 'publish'].some((operation) => perm.action.includes(operation))
        ).length !== 0;
      if (userHasAdequatePermissions) {
        logger.debug(`Creating open-entity record for user: ${userId} entity: ${entityId} entityDocumentId: ${entityDocumentId})`);
        await strapi.db.query('plugin::record-locking.open-entity').create({
          data: {
            user: String(userId),
            entityId,
            entityDocumentId,
            connectionId: socket.id,
          },
        });
      }
      else {
        logger.debug(`User: ${userId} does not have adequate permissions modify this data.`);
      }
    });

    socket.on('closeEntity', async ({ entityId, entityDocumentId, userId }) => {
      logger.debug(`Received closeEntity socket event. Deleting open-entity record for user: ${userId} entity: ${entityId} entityDocumentId: ${entityDocumentId}`);
      await strapi.db.query('plugin::record-locking.open-entity').deleteMany({
        where: {
          user: String(userId),
          entityId: entityId,
          entityDocumentId,
        },
      });
    });

    socket.on('disconnect', async () => {
      logger.debug(`Received disconnect socket event. Deleting open-entity record for connectionId: ${socket.id}`);
      await strapi.db.query('plugin::record-locking.open-entity').deleteMany({
        where: {
          connectionId: socket.id,
        },
      });
    });
  });

  strapi.db.query('plugin::record-locking.open-entity').deleteMany();
  (strapi as any).io = io;
};

export default bootstrap;
