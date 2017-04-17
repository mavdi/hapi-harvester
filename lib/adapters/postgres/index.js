'use strict'

const _ = require('lodash')
const mongoose = require('mongoose')
const Converters = require('./converters');
const debug = require('debug')('hh-adapter')
const Promise = require('bluebird')
const Hoek = require('hoek')
const dot = require('dot-object');

const connection = require('./connection')

mongoose.Promise = Promise

module.exports = function (options) {

    const converters = Converters();
    const models = {};

    options = options || {}

    Hoek.assert(options, 'Postgres connection options missing')

    var db

    const connect = function () {
        return connection.connect(options).then((dbConnected)=>{
            // todo hate to go back to an approach using vars
            // however the whole adapter connect concept needs to be refactored to properly support an immutable approach
            db = dbConnected
            return dbConnected
        })
    }

    const disconnect = function () {
        return connection.disconnect(db)
    }

    const find = function (type, filter, skip, limit, sort, fields) {
        const model = models[type]
        var predicate = converters.toSequelizePredicate(filter)
        predicate.offset = skip
        predicate.order = sort
        predicate.limit = limit
        return model.find(predicate)
            .then((resources)=> {
                let data = converters.toJsonApi(resources.dataValues);

                if (fields) {
                    data = _.map(data, (datum) => {
                        datum.attributes = _.pick(datum.attributes, fields)
                        return datum
                    })
                }

                return data
            })
    }

    const findById = function (type, id, fields) {
        const model = models[type]
        return model.findById(id)
            .then((resources) => {
                if (!resources) {
                    return null
                }
                const data = converters.toJsonApi(resources.dataValues);
                if (fields) {
                    data.attributes = _.pick(data.attributes, fields);
                }
                return data
            })
    }

    const create = function (type, data) {
        const model = models[type]
        if (data.id) {
            data._id = data.id;
            delete data.id;
        }
        return model.create(converters.toSequelizeObject(data), {raw: true})
            .then((created) => {
                return converters.toJsonApi(created.dataValues)
            })
    }

    const update = function (type, id, data) {
        const model = models[type]
        return model.findByIdAndUpdate(id, data)
            .then((resource) => {
                if (!resource) {
                    return null
                }
                return findById(type, id)
            })
    }

    const patch = function(type, id, data) {
        const model = models[type]
        const patchObject = dot.dot(data);
        return model.findByIdAndUpdate(id, patchObject)
        .then((resource) => {
            if (!resource) {
                return null
            }
            return findById(type, id)
        })
    }

    const del = function (type, id) {
        const model = models[type]
        const predicate = converters.toMongoosePredicate({id: id})
        return model.remove(predicate)
            .then(() => {
                return {}
            })
    }

    const processSchema = function (hhSchema) {
        if (!models[hhSchema.type]) {
            models[hhSchema.type] = converters.toSequelizeModel(db, hhSchema)
        }
        return models[hhSchema.type]
    }

    return {
        connect,
        disconnect,
        find,
        findById,
        options,
        create,
        update,
        patch,
        delete: del,
        models,
        processSchema
    }

}