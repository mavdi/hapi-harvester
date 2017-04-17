const _ = require('lodash')
const Sequelize = require('sequelize')

module.exports.connect = function (options) {
    let sequelize = new Sequelize(options.database, options.username, options.password, options)

    return new Promise((resolve, reject) => {
      resolve(sequelize)
    })
}


module.exports.disconnect = function (db) {
    return db.close()
}
