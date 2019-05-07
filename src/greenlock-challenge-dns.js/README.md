# [greenlock-challenge-dns](https://git.coolaj86.com/coolaj86/greenlock-challenge-dns.js)

| A [Root](https://rootprojects.org) Project |

An extremely simple reference implementation
of an ACME (Let's Encrypt) dns-01 challenge strategy
for [Greenlock](https://git.coolaj86.com/coolaj86/greenlock-express.js) v2.7+ (and v3).

```
_acme-challenge.example.com   TXT   xxxxxxxxxxxxxxxx    TTL 60
```

* Prints the ACME challenge DNS Host and DNS Key Authorization Digest to the terminal
  * (waits for you to hit enter before continuing)
* Let's you know when the challenge as succeeded or failed, and is safe to remove.

Other ACME Challenge Reference Implementations:

* [greenlock-challenge-manual](https://git.coolaj86.com/coolaj86/greenlock-challenge-manual.js.git)
* [greenlock-challenge-http](https://git.coolaj86.com/coolaj86/greenlock-challenge-http.js.git)
* [**greenlock-challenge-dns**](https://git.coolaj86.com/coolaj86/greenlock-challenge-dns.js.git)

## Install

```bash
npm install --save greenlock-challenge-dns@3.x
```

If you have `greenlock@v2.6` or lower, you'll need the old `greenlock-challenge-dns@3.x` instead.

## Usage

```bash
var Greenlock = require('greenlock');

Greenlock.create({
  ...
, challenges: { 'http-01': require('greenlock-challenge-http')
              , 'dns-01': require('greenlock-challenge-dns').create({ debug: true })
              , 'tls-alpn-01': require('greenlock-challenge-manual')
              }
  ...
});
```

You can also switch between different implementations by
overwriting the default with the one that you want in `approveDomains()`:

```js
function approveDomains(opts, certs, cb) {
  ...

  if (!opts.challenges) { opts.challenges = {}; }
  opts.challenges['dns-01'] = leChallengeDns;
  opts.challenges['http-01'] = ...

  cb(null, { options: opts, certs: certs });
}
```

NOTE: If you request a certificate with 6 domains listed,
it will require 6 individual challenges.


## Exposed (Promise) Methods

For ACME Challenge:

* `set(opts)`
* `remove(opts)`

The `dns-01` strategy supports wildcards (whereas `http-01` does not).

The options object has whatever options were set in `approveDomains()`
as well as the `challenge`, which looks like this:

```js
{ challenge: {
    identifier: { type: 'dns', value: 'example.com'
  , wildcard: true
  , altname: '*.example.com'
  , type: 'dns-01'
  , token: 'xxxxxx'
  , keyAuthorization: 'xxxxxx.abc123'
  , dnsHost: '_acme-challenge.example.com'
  , dnsAuthorization: 'xyz567'
  , expires: '1970-01-01T00:00:00Z'
  }
}
```

For greenlock.js internals:

* `options` stores the internal defaults merged with the user-supplied options

Optional:

* `get(limitedOpts)`

Note: Typically there wouldn't be a `get()` for DNS because the NameServer (not Greenlock) answers the requests.
It could be used for testing implementations, but that's about it.
(though I suppose you could implement it if you happen to run your DNS and webserver together... kinda weird though)

If there were an implementation of Greenlock integrated directly into
a NameServer (which currently there is not), it would probably look like this:

```js
{ challenge: {
    type: 'dns-01'
  , identifier: { type: 'dns', value: 'example.com' }
  , token: 'abc123'
  , dnsHost: '_acme-challenge.example.com'
  }
}
```
