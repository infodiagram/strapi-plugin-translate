'use strict'

const get = require('lodash/get')
const set = require('lodash/set')
const groupBy = require('lodash/groupBy')

const slugify = require('slugify')
const { getService } = require('../utils/get-service')
const { BatchTranslateManager } = require('./batch-translate')

module.exports = ({ strapi }) => ({
  batchTranslateManager: new BatchTranslateManager(),

  async estimateUsage({ data, fieldsToTranslate }) {
    const text = fieldsToTranslate
      .map(({ field }) => get(data, field, ''))
      .join('')

    return text.length
  },

  async translate({ data, sourceLocale, targetLocale, fieldsToTranslate, priority }) {
    // Do not translate if there is nothing to do (for language variants)
    if (sourceLocale === targetLocale) {
      return data
    }
    const fieldsWithoutEmptyStrings = fieldsToTranslate.filter(
      ({ field }) => data[field].trim() !== '',
    )
    const groupedFields = groupBy(fieldsWithoutEmptyStrings, 'format')
    const slugFields = fieldsToTranslate.filter(
      ({ field }) => /[-_]/.test(data[field]) && !data[field].includes(' ')).map(
      ({ field }) => field,
    )

    const translatedData = { ...data }
    await Promise.all(
      Object.keys(groupedFields).map(async (format) => {
        const textsToTranslate = groupedFields[format].map(
          ({ field }) => {
            const text = get(data, field, '')
            if (slugFields.includes(field)) {
              return text.replace(/[-_]/g, ' ')
            }
            return text
          },
        )
        strapi.log.info("textsToTranslate", textsToTranslate)
        const translateResult = await strapi
          .plugin('translate')
          .provider.translate({
            text: textsToTranslate,
            targetLocale,
            sourceLocale,
            priority,
            format,
          })

        groupedFields[format].forEach(({ field }, index) => {
          let value
          if (slugFields.includes(field)) {
            value = slugify(
              translateResult[index],
              {
                replacement: '-',
                lower: true,
                locale: targetLocale,
                remove: /[`'"]/g,
              },
            )
          } else {
            value = translateResult[index]
          }
          set(translatedData, field, value)
        })
      }),
    )

    return translatedData
  },

  async batchTranslate(params) {
    return this.batchTranslateManager.submitJob(params)
  },
  async batchTranslatePauseJob(id) {
    return this.batchTranslateManager.pauseJob(id)
  },
  async batchTranslateResumeJob(id) {
    return this.batchTranslateManager.resumeJob(id)
  },
  async batchTranslateCancelJob(id) {
    return this.batchTranslateManager.cancelJob(id)
  },
  async contentTypes() {
    const localizedContentTypes = Object.keys(strapi.contentTypes).filter(
      (ct) => strapi.contentTypes[ct].pluginOptions?.i18n?.localized,
    )

    const locales = await strapi.service('plugin::i18n.locales').find()

    const reports = await Promise.all(
      localizedContentTypes.map(async (contentType) => {
        // get jobs
        const jobs = await strapi.db
          .query('plugin::translate.batch-translate-job')
          .findMany({
            where: { contentType: { $eq: contentType } },
            orderBy: { updatedAt: 'desc' },
          })

        // calculate current translation statuses
        const info = await Promise.all(
          locales.map(async ({ code }) => {
            const countPromise = strapi.db
              .query(contentType)
              .count({ where: { locale: code } })
            const complete = await getService('untranslated').isFullyTranslated(
              contentType,
              code,
            )
            return {
              count: await countPromise,
              complete,
            }
          }),
        )

        // create report
        const localeReports = {}
        locales.forEach(({ code }, index) => {
          localeReports[code] = {
            ...info[index],
            job: jobs.find((job) => job.targetLocale === code),
          }
        })
        return {
          contentType,
          collection: strapi.contentTypes[contentType].info.displayName,
          localeReports,
        }
      }),
    )
    return { contentTypes: reports, locales }
  },
})
