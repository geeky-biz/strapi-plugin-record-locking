import type { Core } from '@strapi/strapi';
import DEFAULT_TRANSPORTS from '../constants/transports';
import createPluginLogger from '../utils/logger';

const controller = ({ strapi }: { strapi: Core.Strapi }) => {
  // Create logger instance for this controller
  const logLevel = strapi.plugin('record-locking').config('logLevel') || 'info';
  const logger = createPluginLogger(logLevel);
  
  return {
  async getSettings(ctx) {
    const settings = {
      transports:
        strapi.plugin('record-locking').config('transports') || DEFAULT_TRANSPORTS,
    };

    ctx.send(settings);
  },

  async getLogSettings(ctx) {
    const logSettings = {
      logLevel: strapi.plugin('record-locking').config('logLevel') || 'info',
      enableLogging: strapi.plugin('record-locking').config('enableLogging') || true,
    };
    ctx.send(logSettings);
  },

  async getStatusBySlug(ctx) {
    const { entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    logger.debug(`User ${userId} checking status for document: ${entityDocumentId}`);

    const data = await strapi.db.query('plugin::record-locking.open-entity').findOne({
      where: {
        entityDocumentId,
        user: {
          $not: userId,
        },
      },
    });

    if (data) {
      const user = await strapi.db.query('admin::user').findOne({ where: { id: data.user } });

      return {
        editedBy: `${user.firstname} ${user.lastname}`,
      };
    }

    return false;
  },

  async getStatusByIdAndSlug(ctx) {
    const { entityId, entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    logger.debug(`User ${userId} checking status for entity: ${entityId}, document: ${entityDocumentId}`);
    const data = await strapi.db.query('plugin::record-locking.open-entity').findOne({
      where: {
        entityDocumentId,
        entityId,
        user: {
          $not: userId,
        },
      },
    });

    if (data) {
      const user = await strapi.db.query('admin::user').findOne({ where: { id: data.user } });

      return {
        editedBy: `${user.firstname} ${user.lastname}`,
      };
    }

    return false;
  },

  async setStatusByIdAndSlug(ctx) {
    const { entityId, entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    logger.info(`User ${userId} locking entity: ${entityId}, document: ${entityDocumentId}`);

    await strapi.db.query('plugin::record-locking.open-entity').create({
      data: {
        user: String(userId),
        entityId: entityId,
        entityDocumentId,
      },
    });

    return true;
  },

  async deleteStatusByIdAndSlug(ctx) {
    const { entityId, entityDocumentId } = ctx.request.params;
    const { id: userId } = ctx.state.user;
    logger.info(`User ${userId} unlocking entity: ${entityId}, document: ${entityDocumentId}`);

    await strapi.db.query('plugin::record-locking.open-entity').deleteMany({
      where: {
        user: String(userId),
        entityId: entityId,
        entityDocumentId,
      },
    });

    return 'DELETED';
  },
  };
};

export default controller;
