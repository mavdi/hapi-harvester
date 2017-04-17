const _ = require('lodash')
const Sequelize = require('sequelize')

module.exports.connect = function (options) {
    let sequelize = new Sequelize(options.database, options.username, options.password, options)

    return new Promise((resolve, reject) => {
      resolve(sequelize)
    })
}


module.exports.disconnect = function (db) {
    return new Promise((resolve, reject) => {
        // do not wait on disconnect if not connected
        if(db.base.connections[0] && db.base.connections[0]._readyState === 0) {
            return resolve()
        }

        db.on('close', () => {
            resolve()
        })
        //clear out events
        db.base._events = {}
        db.base.disconnect()
    })
}
