const AWS = require('aws-sdk');

async function getHostedZoneId(altname) {
  const route53 = new AWS.Route53();

  const res = (await route53.listHostedZonesByName(
    {
      DNSName: altname,
      MaxItems: '1',
    },
  ).promise()).HostedZones[0];

  const zoneId = res.Id.match(/(?![/hostedzone/])[a-zA-Z0-9]*/)[0];
  return zoneId;
}

module.exports = {
  getHostedZoneId,
};
