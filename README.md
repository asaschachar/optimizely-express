## Optimizely Express Middleware

### Installation
```javascript
npm install --save https://github.com/asaschachar/optimizely-express.git#1.0.1
```

### Usage
```javascript
var optimizely = require('optimizely-express');

/**
 * Instantiate Optimizely
 *
 * The following instantiates Optimizely using the SDK Key provided.
 * The Optimizely datafile is fetched at a regular interval and the Optimizely client
 * is made available on every route under the request object's `optimizely` property.
 * (See below example of using Optimizely inside a route for '/homepage')
 **/
app.use(optimizely({ sdkKey: 'CZsVVgn6j9ce6fNPt2ZEiB' }));

/**
 * Demonstrates usage of Optimizely in a route
 **/
app.use('/homepage', (req, res, next) => {
  const optimizely = req.optimizely.client
  const enabled = optimizely.isFeatureEnabled('homepage_demo', req.userId);
  res.render('checkout_flow', { demo: enabled });
});


/**
 * Provides a view into the datafile
 *
 * This route displays the current contents of the Optimizely datafile for purposes of debugging and troubleshooting.
 **/
app.use('/optimizely', optimizely.datafileRoute);


/**
 * Provides a webhook route
 *
 * This route enables your application to get webhooks when the datafile changes in Optimizely's application.
 * Note: Setting this up requires setting up the webhook in the Optimizely application first.
 **/
app.use('/optimizely_webhook', bodyParser.text({ type: '*/*' }), optimizely.webhookRoute);


/**
 * Restrict a route's permissions
 *
 * Example of using the function `optimizely.isRouteEnabled` which enables an entire route based on a feature flag.
 **/
const permissionDenied = function(req, res, next) => { res.sendStatus(403) }
app.use('/checkout_flow',
  optimizely.isRouteEnabled('checkout_flow', permissionDenied),
  (req, res, next) => {
    res.render('checkout_flow');
  }
);

```
