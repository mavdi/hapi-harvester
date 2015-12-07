'use strict'

const _ = require('lodash')
const Hapi = require('hapi')
const should = require('should')
const utils = require('./utils')

let server, destroyServer, hh;

describe('Adapter Validation', function() {

    afterEach(function(done) {
        destroyServer(done);
    })

    it('Will check the given adapter for the required functions', function() {
        let adapter = require('../').getAdapter('mongodb')

        adapter = _.remove(adapter, 'delete');

        //rebuild server with the aling adapter
        server = new Hapi.Server()
        server.connection({port : 9100})

        const serverSetup = function() {
            server.register([
                {register: require('../lib/plugin'), options: {adapter : adapter}},
                {register: require('inject-then')}
            ], () => {
                hh = server.plugins.harvester;
                server.start(()=> {})
            })
        }

        expect(serverSetup).to.throw('Adapter validation failed. Adapter missing connect')
    })

    it('Will won\'t accept a string adapter if it doesn\'t exist ', function() {
        //rebuild server with the aling adapter
        server = new Hapi.Server()
        server.connection({port : 9100})

        const serverSetup = function() {
            const adapter = require('../').getAdapter('nonexistant')
            server.register([
                {register: require('../lib/plugin'), options: {adapter : adapter}},
                {register: require('inject-then')}
            ], () => {
                hh = server.plugins.harvester;
                server.start(()=> {})
            })
        }

        expect(serverSetup).to.throw('Wrong adapter name, see docs for built in adapter')
    })

    it('Will return an error if the adapter can\'t connect to the database', function (done) {
        // change config to connect to bogus server
        let config, adapter

        config = { mongodbUrl: 'mongodb://localhost:12345/test' };
        adapter = require('../').getAdapter('mongodb')(config)

        server = new Hapi.Server()
        server.connection({port : 9100})

        // connect to said server
        function serverSetup() {
            return server.register([
                { register: require('../lib/plugin'), options: { adapter: adapter } }
            ], (err) => {
                should.exist(err)
                err.should.have.property('name').and.equal('MongoError');
                err.should.have.property('message').and.match(/ECONNREFUSED.*12345/)
                done()
            })
        }

        // validate we got an error.
        serverSetup();
    })
})

destroyServer = function(done) {
    server.stop(done)
}
