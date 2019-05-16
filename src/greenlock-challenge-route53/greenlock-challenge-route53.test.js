/* global describe it before after */

const AWS = require('aws-sdk');
const uuid = require('uuid/v4');
const { expect } = require('chai');
const GreenlockChallengeRoute53 = require('./greenlock-challenge-route53.js');
const { getHostedZoneId } = require('./utils.js');

describe('set', () => {
  // Set up a random altname to create an HZ for. Form a resource record name,
  // and a value for DNS auth. DNSHOST is the subdomain at which ACME will
  // look for a record.
  const ALTNAME = `${uuid()}.hidden.computer`;
  const DNSHOST = '_testacmevalidation';
  const RRNAME = `${DNSHOST}.${ALTNAME}.`;
  const DNSAUTH = `"${uuid()}"`;

  // Create test.hidden.computer hosted zone
  before(async () => {
    const route53 = new AWS.Route53();

    const params = {
      CallerReference: uuid(),
      Name: ALTNAME,
    };

    await route53.createHostedZone(params).promise();
  });

  // Tear down test.hidden.computer hosted zone
  after(async () => {
    const route53 = new AWS.Route53();

    const HostedZoneId = await getHostedZoneId(ALTNAME);
    const hzParams = {
      Id: HostedZoneId,
    };

    await route53.deleteHostedZone(hzParams).promise();
  });

  it('should post a challenge token to the DNS for the altname', async () => {
    const route53 = new AWS.Route53();
    const greenlockChallenge = GreenlockChallengeRoute53.create({});

    // Form and set the challenge
    const challenge = {
      altname: ALTNAME,
      dnsHost: RRNAME,
      dnsAuthorization: DNSAUTH,
    };
    await greenlockChallenge.set({ challenge });

    // Get the resource record set for our hosted zone
    const HostedZoneId = await getHostedZoneId(challenge.altname);
    const params = {
      HostedZoneId,
      MaxItems: '1',
      StartRecordName: challenge.dnsHost,
      StartRecordType: 'TXT',
    };
    const res = await route53.listResourceRecordSets(params).promise();

    // Pull values out of the result of the record set query
    const evaluatedRRName = res.ResourceRecordSets[0].Name;
    const storedValue = res.ResourceRecordSets[0].ResourceRecords[0].Value;

    // Check if the auth token was properly set
    expect(evaluatedRRName).to.be.equal(RRNAME);
    expect(storedValue).to.be.equal(DNSAUTH);
  });

  it('should remove the challenge token from the DNS', async () => {
    const route53 = new AWS.Route53();
    const greenlockChallenge = GreenlockChallengeRoute53.create({});

    // Form a challenge identical to the one in the previous test, and remove
    // the records added in that test
    const challenge = {
      altname: ALTNAME,
      dnsHost: RRNAME,
      dnsAuthorization: DNSAUTH,
    };
    await greenlockChallenge.remove({ challenge });

    // Query the resource records for the hosted zone we're testing
    const HostedZoneId = await getHostedZoneId(challenge.altname);
    const params = {
      HostedZoneId,
      MaxItems: '1',
      StartRecordName: challenge.dnsHost,
      StartRecordType: 'TXT',
    };
    const res = await route53.listResourceRecordSets(params).promise();

    // There should be no TXT records if we have successfully deleted them
    expect(res.ResourceRecordSets.length).to.equal(0);
  });
});
