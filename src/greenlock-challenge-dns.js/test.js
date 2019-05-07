'use strict';

var tester = require('greenlock-challenge-test');

var type = 'dns-01';
var challenger = require('greenlock-challenge-dns').create({});

// The dry-run tests can pass on, literally, 'example.com'
// but the integration tests require that you have control over the domain
var domain = '*.example.com';

tester.test(type, domain, challenger).then(function () {
  console.info("PASS");
}).catch(function (err) {
  console.error("FAIL");
  console.error(err);
  process.exit(20);
});
