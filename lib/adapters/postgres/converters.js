'use strict'

const Hapi = require('hapi')
const _ = require('lodash')
const Hoek = require('hoek')
const uuid = require('node-uuid')
const Sequelize = require('sequelize')

module.exports = function() {
    const toJsonApi = function (resources) {
        //Sequelize returns null if none is found, pass an object to converter instead
        resources = resources || {}
        console.log('xxxx', resources)
        if (_.isArray(resources)) {
            return _.map(resources, (resource) => {
                return toJsonApiSingle(resource)
            })
        } else {
            return toJsonApiSingle(resources)
        }

        function toJsonApiSingle(resource) {
            return _.chain(resource)
                .thru(attributeExpand)
                .omit('createdAt', 'updatedAt')
                .value()

            function attributeExpand(resource) {
                resource.attributes = {}
                _.each(resource, (prop, key) => {
                    if (key.match(/^attributes_/i)) {
                        resource.attributes[key.split('_')[1]] = prop
                        delete resource[key]
                    }
                })

                return resource
            }
        }
    }

    const toSequelizeObject = function(data) {
        _.each(data.attributes, (attribute, key) => {
            data[`attributes_${key}`] = attribute
        })

        delete data.attributes
        console.log(data)
        return data
    }

    const toSequelizeModel = function (db, hhSchema) {

        const sequelizeSchema = {}

        sequelizeSchema.id = {
            type: Sequelize.UUID,
            primaryKey: true,
            defaultValue: Sequelize.UUIDV4
        }

        sequelizeSchema.type = {
            type: Sequelize.STRING,
            defaultValue: hhSchema.type
        }

        var schemaMap = {
            'string': Sequelize.STRING,
            'number': Sequelize.FLOAT,
            'date': Sequelize.DATE,
            'buffer': Sequelize.TEXT,
            'boolean': Sequelize.BOOLEAN,
            'array': Sequelize.ARRAY,
            'any': Sequelize.JSON
        }

        _.each(hhSchema.attributes, (attribute, key) => {
            Hoek.assert(attribute.isJoi, 'attribute values in the hh schema should be defined with Joi')
            //sadly PG support for nested objects is poor, so we have to define nested attributes like this
            sequelizeSchema[`attributes_${key}`] = {type: schemaMap[attribute._type]}
        })

        // sequelizeSchema.relationships =
        //     _.mapValues(hhSchema.relationships, function (val) {
        //         return _.isArray(val.data) ? {data: Array} : {data: Object}
        //     })

        console.log(hhSchema,sequelizeSchema)
        let schema = db.define(hhSchema.type, sequelizeSchema)
        schema.sync()
        return schema
    }

    const toSequelizePredicate = function(filter) {
        const mappedToModel = _.mapKeys(filter, function (val, key) {
            if (key === 'id') return '_id'
            if (key.indexOf('relationships') === 0) return key
            return `attributes.${key}`
        })

        return _.mapValues(mappedToModel, function (val, key) {
            const supportedComparators = ['lt', 'lte', 'gt', 'gte']

            //if it's a normal value strig, do a $in query
            if (_.isString(val) && val.indexOf(',') !== -1) {
                return {$in: val.split(',')}
            }

            //if it's a comparator, translate to $gt, $lt etc
            _.forEach(val, function (value, key) {
                if (_.includes(supportedComparators, key)) {
                    val[`$${key}`] = value
                    delete val[key]
                }
            })
            return val
        })
    }

    const toSequelizeSort = function(sort) {
        if (!sort) return {'_id' : -1}
        if(sort.indexOf('-') === 0) {
            return {[`attributes.${sort.substr(1)}`] : -1}
        }

        return {[`attributes.${sort}`] : 1}
    }

    return { toJsonApi, toSequelizeObject, toSequelizeModel, toSequelizePredicate, toSequelizeSort }
}
