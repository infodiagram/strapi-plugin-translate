const pluginPkg = require('../../package.json')

const pluginId = pluginPkg.name.replace(/^@infodiagram\/strapi-plugin-/i, '')
module.exports = pluginId
