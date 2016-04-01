"use strict";

var Q = require('q')
var fs = require('fs')
var FactFileParser = require('../shared/FactFileParser')
var typecheck = require('../shared/typecheck')

module.exports = (fileName, getGrammar, getInflection) => {
    typecheck([fileName, getGrammar, getInflection], 'string', 'function', 'function')

    var deferred = Q.defer()

    fs.readFile(fileName, 'utf8', function (err, body) {
        if (err) {
            return deferred.reject(new Error(err))
        }

        deferred.resolve(FactFileParser(body, getGrammar, getInflection))
    })

    return deferred.promise
}
