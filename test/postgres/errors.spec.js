'use strict'

const Joi = require('joi')
const should = require('should')
const Promise = require('bluebird')

const seeder = require('./seeder')
const utils = require('./utils')

const schema = {
    brands: {
        type: 'brands',
        attributes: {
            code: Joi.string().min(2).max(10),
            description: Joi.string()
        },
        options: {
            unique: ['code']
        }
    }
};

const data = {
    type: 'brands',
    attributes: {
        code: 'MF',
        description: 'Massey Furgeson'
    }
};

describe.only('Global Error Handling', function () {

    before(() => {
        return Promise.delay(0)
            .then(() => utils.buildDefaultServer(schema))
            .delay(1000)
    })

    after(utils.createDefaultServerDestructor())

	describe('Given a request for an invalid resource', function () {
		it('should return a JSON+API compliant error', function () {
			return server.injectThen({ method: 'get', url: '/some/bogus/request'})
			.then(res => {
				res.statusCode.should.equal(404)
				expect(res.headers['content-type']).to.equal('application/vnd.api+json')
                should.exist(res.payload)
                let payload = JSON.parse(res.payload)
                payload.should.have.property('errors').and.be.an.Array
                payload.should.not.have.property('data')
                payload.errors.length.should.be.above(0)
                let error = payload.errors[0]
                error.should.have.property('status').and.equal(404)
                error.should.have.property('title').and.equal('Not Found')
			})
		})
	})

    describe.only('Given a duplicate post that voilates a uniqueness constraint on a collection', () => {
        let Brands

        beforeEach(() => {
            Brands = server.plugins['hapi-harvester'].adapter.models.brands

            return Brands.destroy({truncate: true})
            .then(() => {
                // seed brand test data
                return Brands.create({
                    type: 'brands',
                    attributes_code: 'MF'
                });
            })
        })

        after(() => {
            return Brands.destroy({truncate: true})
        })


        it('returns a 409 error to the client', () => {
            let duplicateBrand = data
            return server.injectThen({ method: 'post', url: '/brands', payload: { data: duplicateBrand }})
            .then((res) => {
                console.log(res)
                expect(res.statusCode).to.equal(409)
            })
        })
    })
})
