# Lollipop

## Fake email provider designed to automate transaction email unit tests.

![Cover](public/cover.png)

Few developers have time to write unit tests, so many don’t.

Imagine a signup route that sends an email confirmation link that includes an access token and another route that checks if the right access token is provided.

Wouldn’t it be amazing if unit tests could programmatically use the access token found in that email and provide it to other unit tests synchronously?

We couldn't find anything of the sort so we developed Lollipop!

## Features

- Super simple to use
- Implements [live preview](public/live-preview.png)
- Implements both instance methods and a restful API to query the message store (that’s where sent emails are temporarily stored)
- Uses trusted dependencies ([hapi](https://www.npmjs.com/package/@hapi/hapi), [cheerio](https://www.npmjs.com/package/cheerio), [query-string](https://www.npmjs.com/package/query-string), etc...)
- Written in TypeScript (builds include type definitions)
- Great test coverage (`npm test` or `npm run test-lp` to enable live preview)
- Actively maintained and used in production by the [Lickstats](https://lickstats.com/) team
- Very light codebase to audit

## Getting started

Lollipop works the same way as any other email provider. It is used to "send" emails.

This means Lollipop is implemented in a codebase alongside email providers such as Sengrid.

At [Lickstats](https://lickstats.com/), we use an environment variable to switch between Lollipop (developement) and Sendgrid (production).

## Installation

```shell
npm install lollipop --save-dev
```

## Configuration

By default, the Lollipop API port is set randomly using [get-port](https://www.npmjs.com/package/get-port).

### Environment variables

Variable | Type | Required | Default | Purpose
--- | --- | --- | --- | ---
`LOLLIPOP_PORT` | number | no | random | Sets API port
`DEBUG` | `true` or `false` | no | `false` | Enables debug mode

### Instance properties

Property | Values | Required | Default | Purpose
--- | --- | --- | --- | ---
`livePreview` | `true` or `false` | no | `false` | Enables live preview

## Usage

**When should you use instance methods vs the restful API?**

Instance methods are great when unit tests inject queries directly to the API (for example, when using [inject](https://hapi.dev/api/?v=18.4.0#-await-serverinjectoptions) with [hapi](https://www.npmjs.com/package/@hapi/hapi)).

The restful API is the way to go when your API doesn’t run on the same thread as your unit tests (for example, when using [supertest](https://www.npmjs.com/package/supertest)).

### Create instance

```typescript
'use strict';

import lollipop from 'lollipop';
// If using require, replace by `const lollipop = require('lollipop').default`.

const lollipopInstance = new lollipop({
  livePreview: true
});

lollipopInstance.init();
```

### Send email using instance method (this doesn’t actually send the email, but rather adds it to the message store)

```typescript
let messageId = lollipopInstance.send({
  from: {
    email: 'noreply@lickstats.com',
    name: 'Lickstats' // Name is optional
  },
  to: {
    email: 'johndoe@example.com',
    name: 'John Doe' // Name is optional
  },
  subject: 'Welcome to Lickstats!',
  html: `
    <!DOCTYPE html>
      <html lang="en">
      <body>
        <p>Hey John,</p>
        <p>Please click on the following link to confirm your email.</p>
        <p><a id="email-confirmation-anchor" href="https://app.lickstats.com/login?access_token=51819df95b524388a895738dc4280cca">Confirm your email</a>.</p>
      </body>
    </html>
  `
});
```

### Get latest email from message store using instance method and read `access_token` query string

```typescript
let parsedMessage = lollipopInstance.latest();
let accessToken = parsedMessage.getLink('email-confirmation-anchor').query.access_token;
```

### Get latest email from message store using API and read `access_token` query string

```typescript
import { getLink } from 'lollipop';
import request from 'request-promise-native';
let response = await request({
  uri: 'http://localhost:port/messages/latest',
  json: true
});
let accessToken = getLink(response.body.links, 'email-confirmation-anchor').query.access_token
```

### Get specific email from message store using instance method and read `access_token` query string

```typescript
let parsedMessage = lollipopInstance.message(messageId);
let accessToken = parsedMessage.getLink('email-confirmation-anchor').query.access_token;
```

### Get specific email from message store using API and read `access_token` query string

```typescript
import { getLink } from 'lollipop';
import request from 'request-promise-native';
let response = await request({
  uri: 'http://localhost:port/messages/:messageId',
  json: true
});
let accessToken = getLink(response.body.links, 'email-confirmation-anchor').query.access_token
```

## Contributors

[Sun Knudsen](https://sunknudsen.com/)

## Licence

MIT
