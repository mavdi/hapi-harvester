ADAPTER=mongo ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage
sleep 2
ADAPTER=rethinkdb ./node_modules/.bin/istanbul cover ./node_modules/.bin/_mocha && cat ./coverage/lcov.info | ./node_modules/coveralls/bin/coveralls.js && rm -rf ./coverage