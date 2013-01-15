var API = (function(root, Backbone, XSRF_TOKEN, API_ORIGIN) {
    root.TT = root.TT || {};

    XSRF = {
        _token: undefined,

        set: function(token) {
            this._token = token;
        },

        get: function(isRequired) {
            if (this._token) {
                return this._token;
            }

            if (isRequired !== false) {
                throw new Error('No XSRF token is set');
            }
            return false;
        },

        getIfExists: function() {
            return this.get(false);
        }
    };

    // Hack to automatically set xsrf_token directly in this project
    XSRF.set(XSRF_TOKEN);

    /**
     * Retrieve the absolute URL including protocol,
     * host and given path.
     *
     * @param {string} path
     * @return {string}
     */
    var getAbsoluteUrl = function(path) {
        return API_ORIGIN + path;
    };

    /**
     * Our JavaScript interface to our API.
     *
     * @type {Object}
     */
    var API = root.TT.API = {};

    /**
     * Generate the mediator event name to go along with an
     * api response.
     *
     * @param {string} responseType   Name of the API response type
     * @param {string} method   The API method requested
     * @return {string}
     */
    API.generateEventName = function(responseType, method) {
        return 'api.' + responseType + ':' + method;
    };

    /**
     * The API endpoint, i.e the absolute URL to
     * where all JSON-RPC packages should be targetted.
     *
     * @const
     * @type {string}
     */
    API.ENDPOINT = getAbsoluteUrl('/apiv2/rpc/v1/');

    /**
     * Error codes that may be returned by the server.
     *
     * @const
     */
    API.ERROR_CODES = {
        // JSON-RPC Standard codes
        PARSE_ERROR: -32700,
        INVALID_REQUEST: -32600,
        METHOD_NOT_FOUND: -32601,
        INVALID_PARAMS: -32602,
        INTERNAL: -32603,

        // Miscellaneous errors
        INSUFFICIENT_PERMISSIONS: -32001,
        UNAUTHENTICATED: -32002,
        INCORRECT_HTTP_METHOD: -32003,
        QUOTA_EXCEEDED: -32004,

        // Cart errors
        CART_NOT_CREATED: -32010,
        CART_NOT_FOUND: -32011,
        CART_CANNOT_ADD_ITEM: -32012,
        CART_ITEM_NOT_FOUND: -32013,
        CART_IS_STALE: -32014,
        CART_IS_OVERLOADED: -32015,
        CART_INVALID_SHIPPING: -32016,
        CART_INVALID_DISCOUNT: -32017,

        // Order errors
        ORDER_RECEIVER_CREATE_FAILED: -32020,
        ORDER_RECEIVER_BIND_FAILED: -32021,

        // Internal JS errors
        ABORTED: -32097,
        TIMED_OUT: -32098,
        UNKNOWN: -32099,

        // Storekeeper errors
        STOREKEEPER_BIND: -32110,

        // Store errors
        STORE_SUBDOMAIN_OCCUPIED: -32210,
        STORE_NOT_CREATED: -32211,
        STORE_SUBDOMAIN_ILLEGAL: -32212,

        // User errors
        USER_INCORRECT_CREDENTIALS: -32310,
        USER_NOT_CREATED: -32311,
        USER_ALREADY_EXISTS: -32312,
        USER_PASSWORD_TOO_SHORT: -32313,

        // Shipping errors
        SHIPPING_NOT_CREATED: -33010,

        // Store settings errors
        STORE_PASSWORD_MATCH_USER_PASSWORD: -33020,

        // Checkout errors
        CHECKOUT_CREATING_CONSUMER: -34010,
        CHECKOUT_CREATING_RECEIVER: -34011,
        CHECKOUT_STATE_HASH: -34013,
        CHECKOUT_STORE_CURRENCY: -34014,
        CHECKOUT_SHIPPING_COST: -34015,
        CHECKOUT_TOTAL_COST: -34016,
        CHECKOUT_PURCHASE_DENIED: -34017,
        CHECKOUT_KLARNA: -34018,
        CHECKOUT_MARK_AS_PAID: -34019,
        CHECKOUT_PAYPAL: -34020,
        CHECKOUT_PAYPAL_CONFIRMATION: -34021,
        CHECKOUT_CONFIRM_ALREADY_HANDLED: -34022
    };

    /**
     * API.Batch is in charge of request bundles which are
     * intended to be executed in one HTTP request.
     *
     * Even single requests are executed via the batch interface
     * with the exception of not being bundled of course.
     *
     * @constructor
     */
    var Batch = API.Batch = function() {
        this.locked = false;
        this.xsrf = false;
        this._stack = [];
        return this;
    };

    _.extend(Batch.prototype, {
        /**
         * Reset the batch, i.e removing all previously
         * batched requests and our logic surrounding them.
         *
         * @this {Batch}
         */
        reset: function() {
            if (this._stack && this._stack.length) {
                // call unregister() on all requests on the stack
                _.invoke(this._stack, 'unregister');
            }

            this.locked = false;
            this.xsrf = false;
            this._stack = [];
            this.off();
        },

        /**
         * Create a new request and append it to the
         * current batch.
         *
         * @this {Batch}
         * @param {string} action   The API action to call
         * @param {Object} params   The params to sent to the API action
         * @param {string} method   The HTTP method to utilize
         * @param {string} id   Request identifier to use in JSON-RPC
         * @param {boolean} xsrf   Whether the xsrf token should be included
         */
        append: function(action, params, method, id, xsrf) {
            this.appendRequest(new Request(action, params, method, id, xsrf));
        },

        /**
         * Append the given request instance to the current batch.
         *
         * @this {Batch}
         * @param {Request} request   The request instance
         */
        appendRequest: function(request) {
            if (this.locked) {
                throw new Error('Cannot append ' + request + ' to API batch - batch is locked!');
            }

            this._stack.push(request);
            if (request.xsrf) {
                this.xsrf = true;
            }
        },

        /**
         * Retrieve the length of the stack.
         *
         * @this {Batch}
         * @return {integer}
         */
        getStackLength: function() {
            return this._stack.length;
        },

        /**
         * Retrieve the JSON-RPC payload to send asynchronously
         * to our API endpoint.
         *
         * @this {Object}
         * @return {Object}   The JSON-RPC payload
         */
        getPayload: function() {
            var prepared = [];
            _.each(this._stack, function(request) {
                prepared.push(request.getPayload());
            });

            if (this.getStackLength() === 1) {
                prepared = prepared[0];
            }

            var payload = {
                jsonrpc: JSON.stringify(prepared)
            };

            if (this.xsrf) {
                _.extend(payload, {
                    '_xsrf': XSRF.get()
                });
            }
            return payload;
        },

        /**
         * Send the current batch of API requests.
         *
         * @this {Object}
         */
        send: function() {
            this._execute(this.xsrf ? 'POST' : 'GET');
        },

        /**
         * Validate all the requests included in the
         * current batch.
         *
         * @this {Object}
         */
        validate: function() {
            if (this.getStackLength() === 0) {
                throw new Error('Skipping API batch execution since batch is empty!');
            }
        },

        /**
         * Callback to be executed on successful API requests.
         *
         * @this {Object}
         * @param {Object} data   The API response
         * @param {Object} jqXHR   The XHR object used when the error was thrown
         * @param {string} textStatus   The string representation of the error status
         */
        onSuccess: function(batch, textStatus, jqXHR) {
            if (_.isArray(batch) !== true) {
                batch = new Array(batch);
            }

            var args = Array.prototype.slice.call(arguments, 0);
            this.trigger.apply(this, ['success'].concat(args, this));

            _.each(batch, function(data, index) {
                var eventSuffix = 'error',
                    id = data.id;
                if (data.hasOwnProperty('result')) {
                    data = data.result;
                    eventSuffix = 'success';
                } else {
                    data = data.error;
                }
                this._triggerEvent(eventSuffix, index, data, jqXHR, textStatus);
            }, this);
        },

        /**
         * Callback to be executed on errors.
         *
         * @this {Object}
         * @param {Object} jqXHR   The XHR object used when the error was thrown
         * @param {string} textStatus   The string representation of the error status
         * @param {string} errorThrown   The error text
         */
        onHTTPError: function(jqXHR, textStatus, errorThrown) {
            var args = Array.prototype.slice.call(arguments, 0);
            this.trigger.apply(this, ['error'].concat(args, this));

            this._triggerEvent('error.http', false, jqXHR, textStatus, errorThrown);

            // map HTTP errors to JSON-RPC errors
            var codes = API.ERROR_CODES,
                mapping = {
                    'abort': codes.ABORTED,
                    'timeout': codes.TIMED_OUT,
                    'parsererror': codes.PARSE_ERROR
                },
                data = {};

            data.code = mapping[textStatus] || codes.INTERNAL;
            if (textStatus === 'error') {
                data.message = errorThrown;
            }

            this._triggerEvent('error', false, data, jqXHR, textStatus);
        },

        /**
         * Callback to be executed once the API request is completed.
         *
         * @this {Object}
         * @param {Object} jqXHR   The XHR object used when the error was thrown
         * @param {string} textStatus   The string representation of the error status
         */
        onComplete: function(jqXHR, textStatus) {
            var args = Array.prototype.slice.call(arguments, 0);
            this.trigger.apply(this, ['complete'].concat(args, this));

            this._triggerEvent('complete', false, jqXHR, textStatus);

            this.reset();
        },

        /**
         * Execute the current batch, i.e prepare the JSON-RPC package
         * and send it asynchronously to our API endpoint.
         *
         * @this {Object}
         * @param {string} method   The HTTP method to utilize
         */
        _execute: function(method) {
            this.locked = true;
            this.validate();

            this.trigger('sending', this);
            this._triggerEvent('sending', false);

            $.ajax({
                type: method,
                url: API.ENDPOINT,
                data: this.getPayload(),
                success: _.bind(this.onSuccess, this),
                error: _.bind(this.onHTTPError, this),
                complete: _.bind(this.onComplete, this),
                dataType: 'json'
            });
        },

        /**
         * Trigger a Core mediator event with the necessary
         * event namespace along with the event name suffix given.
         *
         * @this {Object}
         * @param {string} eventSuffix   The event suffix name
         * @param {boolean|integer}   The stack index of the request which should be the target of the event
         */
        _triggerEvent: function(eventSuffix, stackIndex) {
            var stack = this._stack;
            if (_.isNumber(stackIndex)) {
                stack = new Array(stack[stackIndex]);
            }

            var eventArgs = Array.prototype.slice.call(arguments, 2),
                triggerArgs = [eventSuffix].concat(eventArgs);
            _.each(stack, function(request) {
                request.trigger.apply(request, triggerArgs);
            }, this);
        }
    }, Backbone.Events);

    /**
     * The request class in charge of dealing with one single
     * API request along with all of its parameters.
     *
     * @constructor
     * @param {string} action   The API action to target
     * @param {Object} params   The parameters to pass along
     * @param {string} method   The HTTP method to utilize
     * @param {string} id   The JSON-RPC id to use
     * @param {boolean} xsrf   Whether the xsrf token should be included
     * @return {Request}   The request instance
     */
    var Request = API.Request = function(action, params, method, id, xsrf) {
        this.action = action;
        this.id = (id !== undefined) ? id : null;
        this.params = (params !== undefined) ? params : null;
        this.method = (method !== undefined) ? method : 'POST';
        this.method = this.method.toUpperCase();
        this.xsrf = (xsrf !== undefined) ? xsrf : (this.method !== 'GET');

        return this;
    };

    _.extend(Request.prototype, {
        /**
         * Retrieve the API event name to utilize as a Core event
         * along with the given response type.
         *
         * @this {Request}
         * @param {string} responseType   The type of response to listen for
         */
        getEventName: function(responseType) {
            return API.generateEventName(responseType, this.action);
        },

        /**
         * Set an onSuccess callback to be triggered once in case the request
         * receives a successful response.
         *
         * @this {Request}
         * @param {function(Object)}   The callback to set
         */
        setOnSuccess: function(callback, context) {
            this.on('success', callback, context);
        },

        setOnError: function(callback, context) {
            this.on('error', callback, context);
        },

        setOnComplete: function(callback, context) {
            this.on('complete', callback, context);
        },

        getPayload: function() {
            return {
                jsonrpc: '2.0',
                method: this.action,
                params: this.params,
                id: this.id
            };
        },

        /**
         * Send the current request.
         *
         * @this {Request}
         */
        send: function() {
            var batch = new Batch();
            batch.appendRequest(this);
            batch.send();
        },

        /**
         * Unregisters all callbacks for this request.
         */
        unregister: function() {
            this.off();
        }
    }, Backbone.Events);
    return API;
})(window, window.Backbone, window.XSRF_TOKEN, window.API_ORIGIN);
