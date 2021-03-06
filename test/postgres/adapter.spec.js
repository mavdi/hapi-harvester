'use strict'

const _ = require('lodash')
const Hapi = require('hapi')
const Joi = require('joi')
const utils = require('./utils');
const config = require('./config');
const Promise = require('bluebird')

describe('Adapter Validation', function () {

    const harvester = require('../../')
    const postgresAdapter = harvester.getAdapter('postgres')

    function initialiseAdapterWithOptions(adapterInstance) {
        return adapterInstance.connect().then(()=> {
            adapterInstance.disconnect()
        })
    }

    it('Will succeed if passed a valid adapter ', function () {
        return buildServerSetupWithAdapters(postgresAdapter(config))
    })

    it('Will fail if the given adapter is missing a required function', function (done) {

        const adapterWithoutDelete = _.omit(postgresAdapter(config), 'delete')
        buildServerSetupWithAdapters(adapterWithoutDelete)
            .catch(e => {
                expect(e.message).to.equal('Adapter validation failed. Adapter missing delete')
                done()
            })
            .catch(done)
    })

    it('will initialise the adapter with provided options', function () {
        return initialiseAdapterWithOptions(postgresAdapter(config))
    })

    it('Will won\'t accept a string adapter if it doesn\'t exist ', function () {
        function constructAdapter() {
            harvester.getAdapter('nonexistant')
        }

        expect(constructAdapter).to.throw(Error)
    })

    it('should handle attribute named "type"', function () {
        //Given
        const schema = {
            type: 'car',
            attributes: {
                type: Joi.string()
            }
        }
        //When
        var adapterInstance = postgresAdapter(config);
        return adapterInstance.connect().then(function () {
            const model = adapterInstance.processSchema(schema)
            console.log(model)
            expect(model.attributes.attributes_type).to.be.an('object')
            return Promise.delay(1000).then(adapterInstance.disconnect)
        }).catch(function (e) {
            adapterInstance.disconnect();
            throw e;
        })
    })

})

function buildServerSetupWithAdapters(adapter, adapterSSE) {
    return new Promise((resolve, reject)=> {
        var server = new Hapi.Server()
        server.connection()

        server.register([
            {
                register: require('../../'), options: {
                adapter: adapter,
                adapterSSE: adapterSSE
            }
            },
            require('susie'), require('inject-then')
        ], () => {
            server.start((err)=> {
                if (err) {
                    reject(err)
                } else {
                    resolve(server)
                }
            })
        })
    })
}

