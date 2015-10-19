'use strict'

const Hapi = require('hapi')
const _ = require('lodash')
const mongoose = require('mongoose')
const converters = require('./converters')

mongoose.Promise = require('bluebird')

module.exports = function (options) {

    const models = {}

    let disconnect = function(cb) {
        mongoose.disconnect(cb)
    }

    let connect = function(cb) {
        mongoose.connect(options.mongodbUrl, cb)
    }

    let find = function (type, req) {

        const model = models[type]
        const query = req.query
        const limit = query.limit || 1000
        const skip = query.offset || 0
        const sort = query.sort || {'_id': -1}
        var predicate = toMongoosePredicate(query)
        return model.find(predicate).skip(skip).sort(sort).limit(limit).lean().exec()
            .then((resources)=> {
                return {data: converters.toJsonApi(resources)}
            })

    }

    let findById = function(type, req) {

        const model = models[type]
        var predicate = toMongoosePredicate({id: req.params.id})
        return model.find(predicate).lean().exec()
            .then((resources) => {
                return {data: converters.toJsonApi(resources)}
            })

    }

    let create = function(type, req) {

        const model = models[type]
        var data = req.payload.data
        return model.create(data).then((created) => {
            return {data: converters.toJsonApi(created.toObject())}
        })

    }
    
    let del = function(type, req) {

    }

    let processSchema = function(hhSchema) {

        if (!models[hhSchema.type]) {

            // clean up existing models and schemas
            delete mongoose.models[hhSchema.type]
            delete mongoose.modelSchemas[hhSchema.type]

            models[hhSchema.type] = converters.toMongooseModel(hhSchema)
        }
        return models[hhSchema.type]
    }
    
    var toMongoosePredicate = function(query) {
        const mappedToModel = _.mapKeys(query.filter, function (val, key) {
            if (key == 'id') return '_id'
            else return `attributes.${key}`
        })

        return _.mapValues(mappedToModel, function (val, key) {
            if (val.indexOf(',') != -1) return {$in: val.split(',')}
            else return val
        })
    }

    return {
        connect,
        disconnect,
        find,
        findById,
        create,
        delete: del,
        models,
        processSchema
    }

}

