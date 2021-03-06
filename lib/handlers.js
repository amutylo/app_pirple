/**
 * Request handlers file.
 */

//Dependencies.
var _data = require('./data');
var helpers = require('./helpers');
var config = require('./config');

//Define handlers
var handlers = {};

/**
 * Users handler
 */
handlers.users = function(data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) !== -1) {
        var currentHandler = handlers._users[data.method];
        currentHandler(data, callback);
    } else {
        callback(405);
    }
};

//C ontainer for users subhandlers
handlers._users = {};

/**
 * Users POST method
 * @var data.payload array : firstName, lastName, phone, password, tosAgreement
 * optional data: none
 */
handlers._users.post = function(data, callback) {
    // check required fields in data

    var firstName =
        typeof data.payload.firstName == 'string' &&
        data.payload.firstName.trim().length > 0
            ? data.payload.firstName.trim()
            : false;
    var lastName =
        typeof data.payload.lastName === 'string' &&
        data.payload.lastName.trim().length > 0
            ? data.payload.lastName.trim()
            : false;
    var phone =
        typeof data.payload.phone === 'string' &&
        data.payload.phone.trim().length == 10
            ? data.payload.phone.trim()
            : false;
    var password =
        typeof data.payload.password === 'string' &&
        data.payload.password.trim().length > 0
            ? data.payload.password.trim()
            : false;
    var tosAgreement =
        typeof data.payload.tosAgreement === 'boolean' &&
        data.payload.tosAgreement === true
            ? true
            : false;

    if (firstName && lastName && phone && password && tosAgreement) {
        // Check if user already exists
        _data.read('users', phone, function(err, data) {
            if (err) {
                // Hash the password.
                var hashedPassword = helpers.hash(password);
                if (hashedPassword) {
                    //  Create a User obj
                    var userObj = {
                        firstName: firstName,
                        lastName: lastName,
                        phone: phone,
                        hashedPassword: hashedPassword,
                        tosAgreement: true
                    };
                    // Store user
                    _data.create('users', phone, userObj, function(err, data) {
                        if (!err) {
                            callback(200);
                        } else {
                            console.log(err);
                            callback(500, { Error: 'Could not create a user' });
                        }
                    });
                } else {
                    callback(500, {
                        Error: 'Could not hash provided password '
                    });
                }
            } else {
                // User exists
                callback(400, {
                    Error: 'User with the same phone number exists'
                });
            }
        });
    } else {
        callback(400, { Error: 'Missing required fields' });
    }
};

/**
 * Users - GET method
 *
 * @data.phome required
 * @data.optional none
 * @TODO:: only for authenticated users to access their objects.
 */
handlers._users.get = function(data, callback) {
    // Check the phone is valid.
    var phone =
        typeof data.queryString.phone == 'string' &&
        data.queryString.phone.trim().length == 10
            ? data.queryString.phone.trim()
            : false;

    if (phone) {
        // Get token from headers
        var token = helpers.getToken(data);
        // Verify the token is valid
        handlers._tokens.verifyToken(token, phone, function(isValid) {
            if (isValid) {
                // Lookup the user
                _data.read('users', phone, function(err, User) {
                    if (!err) {
                        // Remove the hashed password from User object
                        delete User.hashedPassword;
                        callback(200, User);
                    } else {
                        callback(404);
                    }
                });
            } else {
                callback(400, {
                    Error: 'Missing token in headers or token is invalid.'
                });
            }
        });
    } else {
        callback(400, { Error: 'Required phone number was not provided.' });
    }
};

/**
 * Users - PUT method
 *
 * @data.phone required
 * @data.optional are firstName, lastName, password (one must exist)
 * @TODO:: User can update only their own data.
 */
handlers._users.put = function(data, callback) {
    // Check the phone is valid.
    var update = {};
    update.phone =
        typeof data.payload.phone == 'string' &&
        data.payload.phone.trim().length == 10
            ? data.payload.phone.trim()
            : false;

    // Check optional fields.

    update.firstName =
        typeof data.payload.firstName == 'string' &&
        data.payload.firstName.trim().length > 0
            ? data.payload.firstName.trim()
            : false;
    update.lastName =
        typeof data.payload.lastName === 'string' &&
        data.payload.lastName.trim().length > 0
            ? data.payload.lastName.trim()
            : false;
    update.password =
        typeof data.payload.password === 'string' &&
        data.payload.password.trim().length > 0
            ? data.payload.password.trim()
            : false;
    if (update.phone) {
        if (update.firstName || update.lastName || update.password) {
            // Get token from headers
            var token = helpers.getToken(data);
            // Verify the token is valid
            handlers._tokens.verifyToken(token, phone, function(isValid) {
                if (isValid) {
                    // Lookup User if exists
                    _data.read('users', update.phone, function(err, userData) {
                        if (!err && userData) {
                            // Update user fields.
                            for (var field in userData) {
                                if (update[field]) {
                                    userData = helpers.updateObjectField(
                                        update[field],
                                        userData,
                                        field
                                    );
                                }
                            }

                            // Store updated userData;
                            _data.update(
                                'users',
                                update.phone,
                                userData,
                                function(err) {
                                    if (!err) {
                                        callback(200);
                                    } else {
                                        callback(500, {
                                            Error:
                                                'Could not update requested User'
                                        });
                                    }
                                }
                            );
                        } else {
                            callback(400, {
                                Error: 'Requested user does not exist'
                            });
                        }
                    });
                } else {
                    callback(400, {
                        Error: 'Missing token in headers or token is invalid.'
                    });
                }
            });
        } else {
            callback(400, { Error: 'Missing data to update' });
        }
    } else {
        callback(404, { Error: 'Missing phone as required field' });
    }
};

/**
 * Users - DELETE method
 *
 * @data.phone required
 * @TODO:: Authenticated user delete their own account.
 */
handlers._users.delete = function(data, callback) {
    // Check phone number is valid.
    var phone =
        typeof data.queryString.phone == 'string' &&
        data.queryString.phone.trim().length == 10
            ? data.queryString.phone.trim()
            : false;

    if (phone) {
        _data.read('users', phone, function(err, userData) {
            if (!err && userData) {
                _data.delete('users', phone, function(err) {
                    if (!err) {
                        // Delete each of the user's checks
                        var userChecks =
                            typeof userData.checks === 'object' &&
                            userData.checks instanceof Array
                                ? userData.checks
                                : [];
                        var checksToDel = userChecks.length;
                        if (checksToDel > 0) {
                            var checksDeleted = 0;
                            var deletionErrors = false;

                            //Loop through the checks;
                            userChecks.forEach(function(checkId) {
                                _data.delete('checks', checkId, function(err) {
                                    if (!err) {
                                        deletionErrors = true;
                                    }
                                    checksDeleted++;
                                    if (checksDeleted == checksToDel) {
                                        if (!deletionErrors) {
                                            callback(200);
                                        } else {
                                            callback(500, {
                                                Error:
                                                    'Errors encountered attempting to delete user checks.'
                                            });
                                        }
                                    }
                                });
                            });
                        } else {
                            callback(200);
                        }
                    } else {
                        callback(500, { Error: 'Could not delete the user.' });
                    }
                });
            } else {
                callback(400, { Error: 'Could not find requested User' });
            }
        });
    } else {
        callback(400, { Error: 'Required phone number was not provided.' });
    }
};

/**
 * Tokens handler
 */
handlers.tokens = function(data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) !== -1) {
        var currentHandler = handlers._tokens[data.method];
        currentHandler(data, callback);
    } else {
        callback(405);
    }
};

handlers._tokens = {};

/**
 * Tokens POST method
 *
 * @data.phone - required
 * @data.password - required
 */
handlers._tokens.post = function(data, callback) {
    var phone =
        typeof data.payload.phone == 'string' &&
        data.payload.phone.trim().length == 10
            ? data.payload.phone.trim()
            : false;

    var password =
        typeof data.payload.password === 'string' &&
        data.payload.password.trim().length > 0
            ? data.payload.password.trim()
            : false;

    if (phone && password) {
        // Lookup User having same phone number.
        _data.read('users', phone, function(err, userData) {
            if (!err) {
                //Hash the send password, and compare passwords.
                var hashedPassword = helpers.hash(password);
                if (hashedPassword === userData.hashedPassword) {
                    // If the same, create token and set a 1 hour of time expiration.
                    var tokenId = helpers.createRandomString(20);
                    var expires = Date.now() + 1000 * 60 * 60;

                    if (tokenId) {
                        var tokenObj = {
                            phone: phone,
                            id: tokenId,
                            expires: expires
                        };

                        _data.create('tokens', tokenId, tokenObj, function(
                            err
                        ) {
                            if (!err) {
                                callback(200, tokenObj);
                            } else {
                                callback(400, {
                                    Error: 'Could not create a new token'
                                });
                            }
                        });
                    } else {
                        // Something wrong with helper lib function (It may return false.).
                        callback(400, { Error: 'Error creating tokenId.' });
                    }
                } else {
                    callback(400, { Error: 'Passwords did not match' });
                }
            } else {
                callback(400, {
                    Error: 'Could not found User having phone number: ' + phone
                });
            }
        });
    } else {
        callback(400, {
            Error: 'Missing required fields (either phone or password).'
        });
    }
};

/**
 * Tokens - GET method
 *
 * @data.id - required
 */
handlers._tokens.get = function(data, callback) {
    // Check the id is valid.
    var id =
        typeof data.queryString.id == 'string' &&
        data.queryString.id.trim().length == 20
            ? data.queryString.id.trim()
            : false;

    if (id) {
        _data.read('tokens', id, function(err, tokenData) {
            if (!err) {
                // Remove the hashed password from User object
                callback(200, tokenData);
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { Error: 'Required id was not provided.' });
    }
};

/**
 * Tokens - PUT method
 *
 * @data.id - required
 * @data.extend - required (to extend token expire time)
 */
handlers._tokens.put = function(data, callback) {
    var id =
        typeof data.payload.id === 'string' &&
        data.payload.id.trim().length === 20
            ? data.payload.id.trim()
            : false;
    var extend =
        typeof data.payload.extend === 'boolean' && data.payload.extend === true
            ? true
            : false;
    if (id && extend === true) {
        //Lookup the token
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                // Check if token does not expired.
                if (tokenData.expires > Date.now()) {
                    // Set the expiration plus 1 hour.
                    tokenData.expires = Date.now() + 1000 * 60 * 60;
                    // Store updated token
                    _data.update('tokens', tokenData.id, tokenData, function(
                        err
                    ) {
                        if (!err) {
                            callback(200);
                        } else {
                            callback(400, {
                                Error:
                                    'Could not update token with new expiration time'
                            });
                        }
                    });
                } else {
                    callback(400, {
                        Error: 'Token has been expired and can not be extended'
                    });
                }
            } else {
                callback(400, { Error: 'Requested token does not exist.' });
            }
        });
    } else {
        callback(400, { Error: 'Required id or extend were not provided.' });
    }
};

/**
 * Tokens - DELETE method
 *
 * @data.id - required
 */
handlers._tokens.delete = function(data, callback) {
    var id =
        typeof data.queryString.id === 'string' &&
        data.queryString.id.trim().length === 20
            ? data.queryString.id.trim()
            : false;
    if (id) {
        _data.read('tokens', id, function(err, tokenData) {
            if (!err && tokenData) {
                _data.delete('tokens', id, function(err) {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(400, {
                            Error: 'Could not delete token with id: ' + id
                        });
                    }
                });
            } else {
                callback(400, { Error: 'Could not find token.' });
            }
        });
    } else {
        callback(400, {
            Error: 'Required field (id) is not provided or it is not valid'
        });
    }
};

// Check if a given token id is valid for given user.
handlers._tokens.verifyToken = function(id, phone, callback) {
    _data.read('tokens', id, function(err, tokenData) {
        if (!err && tokenData) {
            if (tokenData.phone === phone && tokenData.expires > Date.now()) {
                callback(true);
            } else {
                callback(false);
            }
        } else {
            callback(false);
        }
    });
};

//Main checks
handlers.checks = function(data, callback) {
    var acceptableMethods = ['post', 'get', 'put', 'delete'];
    if (acceptableMethods.indexOf(data.method) !== -1) {
        var currentHandler = handlers._checks[data.method];
        currentHandler(data, callback);
    } else {
        callback(405);
    }
};

// checks container
handlers._checks = {};

/**
 * checks - POST method
 *
 * @data.protocol
 * @data.url
 * @data.method
 * @data.successCodes
 * @data.timeoutSeconds
 *
 */
handlers._checks.post = function(data, callback) {
    //validate inputs
    var protocol =
        typeof data.payload.protocol === 'string' &&
        ['http', 'https'].indexOf(data.payload.protocol) !== -1
            ? data.payload.protocol
            : false;
    var url =
        typeof data.payload.url === 'string' &&
        data.payload.url.trim().length > 0
            ? data.payload.url.trim()
            : false;
    var method =
        typeof data.payload.method === 'string' &&
        data.payload.method.length > 0 &&
        ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) !== -1
            ? data.payload.method
            : false;
    var sucessCodes =
        typeof data.payload.sucessCodes === 'object' &&
        data.payload.sucessCodes instanceof Array &&
        data.payload.sucessCodes.length > 0
            ? data.payload.sucessCodes
            : false;
    var timeoutSeconds =
        typeof data.payload.timeoutSeconds === 'number' &&
        data.payload.timeoutSeconds % 1 === 0 &&
        data.payload.timeoutSeconds >= 1 &&
        data.payload.timeoutSeconds <= 5
            ? data.payload.timeoutSeconds
            : false;
    if (protocol && url && method && sucessCodes && timeoutSeconds) {
        //Get the token
        var token = helpers.getToken(data);

        //Lookup the user with such token
        _data.read('tokens', token, function(err, tokenData) {
            if (!err) {
                var userPhone = tokenData.phone;
                //Lookup the user data
                _data.read('users', userPhone, function(err, userData) {
                    if (!err && userData) {
                        var userChecks =
                            typeof userData.checks === 'object' &&
                            userData.checks instanceof Array
                                ? userData.checks
                                : [];

                        // Verify that the User has max checks per user.
                        if (userChecks.length < config.maxChecks) {
                            // Create a random id for the check
                            var checkId = helpers.createRandomString(20);

                            // Create a check object with user phone.
                            var checkObj = {
                                id: checkId,
                                userPhone: userPhone,
                                protocol: protocol,
                                url: url,
                                method: method,
                                succesCodes: sucessCodes,
                                timeoutSeconds: timeoutSeconds
                            };

                            // Save the object
                            _data.create('checks', checkId, checkObj, function(
                                err
                            ) {
                                if (!err) {
                                    // Add checkid to User object
                                    userData.checks = userChecks;

                                    userData.checks.push(checkId);

                                    //Save updated User
                                    _data.update(
                                        'users',
                                        userPhone,
                                        userData,
                                        function(err) {
                                            if (!err) {
                                                //Return the data about new check
                                                callback(200, checkObj);
                                            } else {
                                                callback(500, {
                                                    Error:
                                                        'Could not update the user with the new check.'
                                                });
                                            }
                                        }
                                    );
                                } else {
                                    callback(500, {
                                        Error: 'Could not create a check.'
                                    });
                                }
                            });
                        } else {
                            callback(400, {
                                Error:
                                    'User already has maximum number of checks - [ ' +
                                    config.maxChecks +
                                    ' ]'
                            });
                        }
                    } else {
                        callback(403);
                    }
                });
            } else {
                callback(403);
            }
        });
    } else {
        callback(400, {
            Error:
                'Missing required inputs or they are invalid: protocol or url or method or succesCodes or timeoutSeconds'
        });
    }
};

handlers._checks.get = function(data, callback) {
    // Check the phone is valid.
    var id =
        typeof data.queryString.id == 'string' &&
        data.queryString.id.trim().length == 20
            ? data.queryString.id.trim()
            : false;

    if (id) {
        // Lookup the checks
        _data.read('checks', id, function(err, checkData) {
            if (!err && checkData) {
                //Get the token from the header
                var token = helpers.getToken(data);

                // Verify if token is valid and belongs to the user.
                handlers._tokens.verifyToken(
                    token,
                    checkData.userPhone,
                    function(tokenIsValid) {
                        if (tokenIsValid) {
                            //Return the checkData
                            callback(200, checkData);
                        } else {
                            callback(403);
                        }
                    }
                );
            } else {
                callback(404);
            }
        });
    } else {
        callback(400, { Error: 'Required id was not provided.' });
    }
};

/**
 * Checks PUT method
 * @data.id - required
 * optional @data: protocol, url, method, successCodes, timeoutSeconds
 */
handlers._checks.put = function(data, callback) {
    //Check required fields
    var update = {};
    update.id =
        typeof data.payload.id == 'string' &&
        data.payload.id.trim().length == 20
            ? data.payload.id.trim()
            : false;
    var protocol =
        typeof data.payload.protocol === 'string' &&
        ['http', 'https'].indexOf(data.payload.protocol) !== -1
            ? data.payload.protocol
            : false;
    update.protocol =
        typeof data.payload.protocol === 'string' &&
        data.payload.protocol.trim().length > 0
            ? data.payload.protocol.trim()
            : false;
    update.url =
        typeof data.payload.url === 'string' &&
        data.payload.url.trim().length > 0
            ? data.payload.url.trim()
            : false;
    update.method =
        typeof data.payload.method === 'string' &&
        data.payload.method.length > 0 &&
        ['post', 'get', 'put', 'delete'].indexOf(data.payload.method) !== -1
            ? data.payload.method
            : false;
    update.sucessCodes =
        typeof data.payload.sucessCodes === 'object' &&
        data.payload.sucessCodes instanceof Array &&
        data.payload.sucessCodes.length > 0
            ? data.payload.sucessCodes
            : false;
    update.timeoutSeconds =
        typeof data.payload.timeoutSeconds === 'number' &&
        data.payload.timeoutSeconds % 1 === 0 &&
        data.payload.timeoutSeconds >= 1 &&
        data.payload.timeoutSeconds <= 5
            ? data.payload.timeoutSeconds
            : false;
    if (update.id) {
        //Check if one of the optional field is exists
        if (
            update.protocol ||
            update.url ||
            update.method ||
            update.sucessCodes ||
            update.timeoutSeconds
        ) {
            //Looking up the check
            _data.read('checks', update.id, function(err, checkData) {
                if (!err && checkData) {
                    var token = helpers.getToken(data);
                    // Verify if token is valid and belongs to the user.
                    handlers._tokens.verifyToken(
                        token,
                        checkData.userPhone,
                        function(tokenIsValid) {
                            if (tokenIsValid) {
                                // Update user fields.
                                for (var field in checkData) {
                                    if (update[field]) {
                                        checklData = helpers.updateObjectField(
                                            update[field],
                                            checkData,
                                            field
                                        );
                                    }
                                }
                                // Store updated object
                                _data.update(
                                    'checks',
                                    update.id,
                                    checkData,
                                    function(err) {
                                        if (!err) {
                                            callback(200, checkData);
                                        } else {
                                            callback(500, {
                                                Error:
                                                    'Could not update the check with id: ' +
                                                    update.id
                                            });
                                        }
                                    }
                                );
                            } else {
                                callback(403);
                            }
                        }
                    );
                } else {
                    callback(400, {
                        Error: 'Check id: ' + update.id + ' does not exist'
                    });
                }
            });
        } else {
            callback(404, {
                Error:
                    'Missing one of the optional fields: url or method or successCode or timeoutSeconds'
            });
        }
    } else {
        callback(400, { Error: 'Missing required field - id' });
    }
};
/**
 * Checks DELETE methods
 *
 */
handlers._checks.delete = function(data, callback) {
    // Check id number is valid.
    var id =
        typeof data.queryString.id == 'string' &&
        data.queryString.id.trim().length == 10
            ? data.queryString.id.trim()
            : false;

    if (id) {
        //Lookup the check
        _data.read('checks', id, function(err, checkData) {
            if (!err && checkData) {
                var token = helpers.getToken(data);
                // Verify if token is valid and belongs to the user.
                handlers._tokens.verifyToken(
                    token,
                    checkData.userPhone,
                    function(tokenIsValid) {
                        if (tokenIsValid) {
                            // Delete the check data
                            _data.delete('checks', id, function(err) {
                                if (!err) {
                                    // Lookup the user in collection
                                    data.read(
                                        'users',
                                        checkData.userPhone,
                                        function(err, userData) {
                                            if (!err && userData) {
                                                var userChecks =
                                                    typeof userData.checks ===
                                                        'object' &&
                                                    userData.checks instanceof
                                                        Array
                                                        ? userData.checks
                                                        : [];

                                                //Remove deleted check from list of checks.
                                                var checkPos = userChecks.indexOf(
                                                    id
                                                );
                                                if (checkPos !== -1) {
                                                    userChecks.splice(checkPos);

                                                    // Resave userData;
                                                    _data.update(
                                                        'users',
                                                        userData.phone,
                                                        userData,
                                                        function(err) {
                                                            if (!err) {
                                                                callback(200);
                                                            } else {
                                                                callback(500, {
                                                                    Error:
                                                                        'Could not update the user with news user data.'
                                                                });
                                                            }
                                                        }
                                                    );
                                                } else {
                                                    callback(500, {
                                                        Error:
                                                            'Could not find user check to remove.'
                                                    });
                                                }
                                            } else {
                                                callback(500, {
                                                    Error:
                                                        'Could not find user who created the check.'
                                                });
                                            }
                                        }
                                    );
                                } else {
                                    callback(500, {
                                        Error: 'Could not delete the check '
                                    });
                                }
                            });
                        } else {
                        }
                    }
                );
            } else {
                callback(400, {
                    Error: 'Check with an id: ' + id + ' does not exist.'
                });
            }
        });
    } else {
        callback(400, { Error: 'Missing required field id.' });
    }
    if (phone) {
        _data.read('users', phone, function(err, User) {
            if (!err) {
                _data.delete('users', phone, function(err) {
                    if (!err) {
                        callback(200);
                    } else {
                        callback(500, { Error: 'Could not delete the user.' });
                    }
                });
            } else {
                callback(400, { Error: 'Could not find requested User' });
            }
        });
    } else {
        callback(400, { Error: 'Required phone number was not provided.' });
    }
};

handlers.ping = function(data, callback) {
    //callback http status code and
    callback(200);
};

//Not found handler;
handlers.notFound = function(data, callback) {
    callback(404);
};

module.exports = handlers;
