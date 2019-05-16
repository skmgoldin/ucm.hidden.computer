/* eslint-disable no-underscore-dangle */

const AWS = require('aws-sdk');
const { getHostedZoneId } = require('./utils.js');

const Challenge = module.exports;

// If your implementation needs config options, set them. Otherwise, don't bother (duh).
Challenge.create = (config) => {
  const challenger = {};

  // Note: normally you'd these right in the method body, but for the sake of
  // "Table of Contents"-style documentation, I've pulled them out.

  // Note: All of these methods can be synchronous, async, Promise, and callback-style
  // (the calling functions check function.length and then Promisify accordingly)

  // Called when it's tiem to set the challenge
  challenger.set = async opts => Challenge._setDns(opts);

  // Called when it's time to remove the challenge
  challenger.remove = async opts => Challenge._removeDns(opts);

  // Optional (only really useful for http and testing)
  // Called when the challenge needs to be retrieved
  challenger.get = opts => Challenge._getDns(opts);

  // Whatever you assign to 'options' will be merged into the incoming 'opts' beforehand
  // (for convenience, so you don't have to do the if (!x) { x = y; } dance)
  // (also, some defaults are layered, so it's good to set it any that you have)
  challenger.options = { debug: config.debug };

  return challenger;
};

// Post the challenge token to Route53 as a TXT record
Challenge._setDns = async (args) => {
  const { challenge } = args;
  const route53 = new AWS.Route53();

  // If it's a wildcard altname, strip the wildcard for our purposes here
  const altname = challenge.altname.slice(0, 2) === '*.' ? challenge.altname.slice(2) : challenge.altname;

  const HostedZoneId = await getHostedZoneId(altname);

  const params = {
    ChangeBatch: {
      Changes: [
        {
          Action: 'UPSERT',
          ResourceRecordSet: {
            Name: challenge.dnsHost,
            ResourceRecords: [
              {
                Value: challenge.dnsAuthorization,
              },
            ],
            TTL: 60,
            Type: 'TXT',
          },
        },
      ],
    },
    HostedZoneId,
  };

  await route53.changeResourceRecordSets(params).promise();

  // eslint-disable-next-line no-console
  console.log(`Added TXT record ${challenge.dnsHost} : ${challenge.dnsAuthorization} to hosted zone with name ${altname} and ID ${HostedZoneId}`);
};

// Remove the DNS validation records
Challenge._removeDns = async (args) => {
  const { challenge } = args;
  const route53 = new AWS.Route53();

  // If it's a wildcard altname, strip the wildcard for our purposes here
  const altname = challenge.altname.slice(0, 2) === '*.' ? challenge.altname.slice(2) : challenge.altname;

  const HostedZoneId = await getHostedZoneId(challenge.altname);

  const rrParams = {
    ChangeBatch: {
      Changes: [
        {
          Action: 'DELETE',
          ResourceRecordSet: {
            Name: challenge.dnsHost,
            ResourceRecords: [
              {
                Value: challenge.dnsAuthorization,
              },
            ],
            TTL: 60,
            Type: 'TXT',
          },
        },
      ],
    },
    HostedZoneId,
  };

  await route53.changeResourceRecordSets(rrParams).promise();

  // eslint-disable-next-line no-console
  console.log(`Removed TXT record ${challenge.dnsHost} : ${challenge.dnsAuthorization} from hosted zone with name ${altname} and ID ${HostedZoneId}`);
};

// This is implemented here for completeness (and perhaps some possible use in testing),
// but it's not something you would implement because the Greenlock server isn't the NameServer.
Challenge._getDns = (args) => {
  const ch = args.challenge;
  // because the way to mock a DNS challenge is weird
  const altname = (ch.altname || ch.dnsHost || ch.identifier.value);
  const dnsHost = (ch.dnsHost || ch.identifier.value);

  if (ch._test || !Challenge._getCache[ch.token]) {
    Challenge._getCache[ch.token] = true;
    /* eslint-disable no-console */
    console.info('');
    console.info(`[ACME ${ch.type} '${altname}' REQUEST]: ${ch.status}`);
    console.info(`The '${ch.type}' challenge request has arrived!`);
    console.info(`dig TXT ${dnsHost}`);
    console.info('(paste in the "DNS Authorization" you received a moment ago to respond)');
    /* eslint-enable no-console */
    process.stdout.write('> ');
  }

  return new Promise(((resolve, reject) => {
    process.stdin.resume();
    process.stdin.once('error', reject);
    process.stdin.once('data', (chunk) => {
      process.stdin.pause();

      let result = chunk.toString('utf8').trim();
      try {
        result = JSON.parse(result);
      } catch (e) {
        args.challenge.dnsAuthorization = result; // eslint-disable-line no-param-reassign
        result = args.challenge;
      }
      if (result.dnsAuthorization) {
        resolve(result);
        return;
      }

      // The return value will checked. It must not be 'undefined'.
      resolve(null);
    });
  }));
};
Challenge._getCache = {};
