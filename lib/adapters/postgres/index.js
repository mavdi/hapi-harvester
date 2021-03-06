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
        return model.findAll(predicate)
            .then((resources)=> {
                let data = converters.toJsonApi(resources.map((item) => item.dataValues))

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
                //create related objects
                return Promise.all(_.each(data.relationships, (relationship, key) => {
                    return created.setPets({id: relationship.data[0].id})
                }))
            })
            .then((created) => {
                return converters.toJsonApi(created.dataValues)
            })
    }

    const update = function (type, id, data) {
        const model = models[type]
        return model.update(data, {where: {id}})
            .then((resource) => {
                if (!resource) {
                    return null
                }
                return findById(type, id)
            })
    }

    const patch = function(type, id, data) {
        const model = models[type]
        const patchObject = converters.toSequelizeObject(data)
        return model.update(patchObject, {where: {id}})
        .then((resource) => {
            if (!resource) {
                return null
            }
            return findById(type, id)
        })
    }

    const del = function (type, id) {
        const model = models[type]
        return model.destroy({where: {id}})
            .then(() => {
                return {}
            })
    }

    const processSchema = function (hhSchema) {
        if (!models[hhSchema.type]) {
            models[hhSchema.type] = converters.toSequelizeModel(db, hhSchema, models)
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