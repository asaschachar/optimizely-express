/**
 * Optimizely Express
 *
 * Copyright 2019, Optimizely
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

'use strict'

const OptimizelySdk = require('@optimizely/optimizely-sdk');
const { DatafileManager } = require('@optimizely/js-sdk-datafile-manager');
const crypto = require('crypto');
const bodyParser = require('body-parser')


/**
 * optimizely
 *
 * Middelware which initializes and installs the Optimizely SDK onto an express request object
 *
 * @param {Object} options
 * @param {Object} options.logLevel log level for the default logger
 *
 * @returns {Function} to handle the express request
 */
function optimizely(options) {

  let {
    sdkKey,
    datafile,
    logLevel,
  } = options;

  const manager = new DatafileManager({
    sdkKey,
    ...options
  });

  manager.on('update', () => { datafile = manager.get() });
  manager.onReady().then(() => { datafile = manager.get() });

  manager.start();

  return function optimizely(req, res, next) {
    const optimizelyClient = OptimizelySdk.createInstance({
      datafile: datafile,
      ...options
    });

    req.optimizely = {
      datafile: datafile || {},
      client: optimizelyClient,
    }

    next();
  }
}

/**
 * datafileRoute
 *
 * Provides a route that exposes the contents of the datafile currently loaded in your application
 *
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @param {Function} next express routing next function
 */
function datafileRoute(req, res, next) {
  const datafile = (req && req.optimizely && req.optimizely.datafile) || {}
  res.setHeader('Content-Type', 'application/json');
  res.status(200).send(JSON.stringify(datafile, null, '  '));
}

/**
 * webhookRoute
 *
 * Provides a route that exposes the contents of the datafile currently loaded in your application
 *
 * @param {Object} req express request object
 * @param {Object} res express response object
 * @param {Function} next express routing next function
 */
function webhookRoute(req, res, next) {
  const WEBHOOK_SECRET = process.env.OPTIMIZELY_WEBHOOK_SECRET

  if (!WEBHOOK_SECRET) {
    console.log('Webhook secret not found in environment variables, please set OPTIMIZELY_WEBHOOK_SECRET')
    res.status(500)
  }

  if (typeof(req.body) !== 'string') {
    console.log('Webhook secret could not be verified because body was not parsed as a string')
    res.status(500)
  }

  const requestSignature = req.header('X-Hub-Signature')
  const hmac = crypto.createHmac('sha1', WEBHOOK_SECRET)
  const webhookDigest = hmac.update(req.body).digest('hex')
  const computedSignature = `sha1=${webhookDigest}`

  console.log('Request Signature: ', requestSignature);
  console.log('Computed Signature: ', computedSignature);

  if (computedSignature !== requestSignature) {
    res.status(500).send('Webhook payload determined not secure')
  } else {
    console.log('DATAFILE UPDATE SECURE WEBHOOK RECIEVED');
    res.sendStatus(200)
  }
}


/**
 * isRouteEnabled
 *
 * Provides a method which can be used to block a route in express on whether the feature is enabled or not
 *
 * @param {String} featureKey for the specific feature in question
 * @param {Function} onRouteDisabled function called when the feature is disabled
 * @param {Error} featureKey for the specific feature in question
 *
 * @returns {Function}
 */
function isRouteEnabled(featureKey, onRouteDisabled) {
  return function (req, res, next) {
    // TODO: Improve design of user Id
    //req.userId = req.userId || 'test123'
    const optimizelyClient = req && req.optimizely && req.optimizely.client
    if (optimizelyClient) {
      const enabled = optimizelyClient.isFeatureEnabled(featureKey, req.userId);
      if (enabled) {
        // Feature is enabled move on to next route
        next();
        return
      }
    }
    onRouteDisabled(req, res, next);
  }
}


module.exports = optimizely
module.exports.webhookRoute = webhookRoute
module.exports.datafileRoute = datafileRoute
module.exports.isRouteEnabled = isRouteEnabled
