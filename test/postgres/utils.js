'use strict';

const _ = require('lodash');
const config = require('./config');

var utils = {
    getData: (res) => {
        const data = res.result.data;
        return _.omit(data, 'id')
    },
    removeFromDB: (server, collections) => {
        var promises = _.map(collections, function (item) {
            const model = server.plugins['hapi-harvester'].adapter.models[item];
            return model.remove({}).lean().exec();
        });
        return Promise.all(promises);
    },
    buildServer: (schemas, options) => {
        options = options || {};
        let server;
        const Hapi = require('hapi');

        const harvester = require('../../');
        const postgresAdapter = harvester.getAdapter('postgres')

        server = new Hapi.Server();
        server.connection({port: options.port || 9100});
        return new Promise((resolve) => {
            server.register([{
                register: harvester,
                options: {
                    adapter: postgresAdapter(config)
                }
            }, require('susie'), require('inject-then')
            ], () => {
                let harvester = server.plugins['hapi-harvester'];
                server.start(() => {
                    _.forEach(schemas, function (schema) {
                        const routes = harvester.routes.all(schema)
                        _.forEach(routes, (route) => server.route(route))
                    });
                    resolve({server, harvester})
                })
            })
        });
    },
    buildDefaultServer: function (schemas) {
        return utils.buildServer(schemas).then(function (res) {
            global.server = res.server;
            global.harvester = res.harvester;
            return res.server;
        });
    },
    createDefaultServerDestructor: function () {
        return function () {
            return server.plugins['hapi-harvester'].rawAdapter.drop().then(() => {
                return server.stop()
            })
        }
    }
};

module.exports = utils;
