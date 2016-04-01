"use strict";

var _ = require('underscore')
var typecheck = require('./typecheck')

var Word = require('./Word')

var MAX_SIMULTANEOUS_STUDY = 10
var EASY_REPETITIONS = 5
var HARD_REPETITIONS = 10

function cloneArray(sentences) {
    return sentences.slice(0, sentences.length);
}

var StudyResult = Class.extend({
    init: function() {
        this.unknownById = {}
        this.studyingById = {}
        this.knownById = {}
    }
})

var Knowledge = Class.extend({
    init: function() {
        this.studyingById = {}
        this.knownById = {}
        this.learningSince = {}

        this.inadequateRepetition = {}
    },

    learnedFact: function (factId) {
        delete this.studyingById[factId]

        this.knownById[factId] = 1
    },

    firstSawFact: function (factId) {
        this.studyingById[factId] = 1
    },

    repeatedFact: function (factId) {
        this.studyingById[factId]++
    },

    learn: function(studyResult, factIndex) {
        _.forEach(_.keys(studyResult.knownById), (factId) => {
            var reps = this.knownById[factId]++

            if (isNaN(reps)) {
                throw new Error('Did not know known ID ' + factId)
            }
        })

        _.forEach(_.values(studyResult.unknownById).concat(_.values(studyResult.studyingById)), (fact) => {
            var unknownId = fact.getId()
            var alreadyStudied = this.studyingById[unknownId]

            if (alreadyStudied >= (fact.isHardFact && fact.isHardFact() ? HARD_REPETITIONS : EASY_REPETITIONS) - 1) {
                this.learnedFact(unknownId)
            }
            else if (alreadyStudied > 0) {
                this.repeatedFact(unknownId)
            }
            else {
                this.firstSawFact(unknownId, factIndex)
            }
        })
    },

    seekToLearn: function(fact, factIndex) {
        this.studyingById[fact] = 0
        this.learningSince[fact.getId()] = factIndex
    },

    evaluateFactSet: function(factSet) {
        var knowledge = this

        var result = new StudyResult()

        factSet.visitFacts(function(fact) {
            var id = fact.getId()

            if (knowledge.studyingById[id] !== undefined) {
                result.studyingById[id] = fact
            }
            else if (knowledge.knownById[id]) {
                result.knownById[id] = fact
            }
            else {
                result.unknownById[id] = fact
            }
        })

        return result
    },

    checkAdequateRepetition: function(fact, factIndex) {
        if (factIndex < MAX_SIMULTANEOUS_STUDY * 3 / 2) {
            return
        }

        var SCHEDULE = [ 0, 1, 2, 3, 3, 4, 4, 5, 5 ]

        for (let factId of _.keys(this.studyingById)) {
            var firstSeen = this.learningSince[factId]

            if (firstSeen == undefined) {
                console.log(this.learningSince)

                throw new Error('Had never seen ' + factId)
            }

            var age = factIndex - firstSeen
            var reps = this.studyingById[factId]

            if (!this.inadequateRepetition[factId] && age < SCHEDULE.length && reps < SCHEDULE[age]) {
                console.log('Only', reps, 'repetitions for', factId + '. Expected ' + SCHEDULE[age]
                    + '\n    at (/projects/morpheem-jp/public/corpus/russian/facts.txt:' + fact.line + ':1)'
                )

                throw Error()

                this.inadequateRepetition[factId] = true
            }
        }
    }
})

var FactOrder = Class.extend({
    init: function(facts) {
        var seen = {}

        var factIndexById = {}

        _.forEach(facts, function(fact, index) {
            if (!fact.getId) {
                throw new Error(fact + ' is not a fact. Is it a particle? Use grammar instead.')
            }

            if (factIndexById[fact.getId()] !== undefined) {
                throw new Error('Double fact ' + fact)
            }

            factIndexById[fact.getId()] = index
        })

        this.factIndexById = factIndexById
        this.facts = facts
    },

    discoverMore: function(sentences) {

    },

    evaluateConsistency: function(sentences) {
        var t = new Date().getTime()

        sentences = cloneArray(sentences)

        var knowledge = new Knowledge()

        var sentencesByFactIndex = []

        for (var sentenceIndex = 0; sentenceIndex < sentences.length; sentenceIndex++) {
            var sentence = sentences[sentenceIndex]

            var highestFactIndex = -1

            let ignore

            sentence.visitFacts((fact) => {
                var factIndex = this.factIndexById[fact.getId()]

                if (factIndex == null) {
                    console.log('Fact ' + fact.getId() + ' not in fact order. Ignoring ' + sentence)

                    ignore = true
                }

                if (factIndex > highestFactIndex) {
                    highestFactIndex = factIndex
                }
            })

            if (ignore) {
                continue
            }

            if (highestFactIndex == -1) {
                console.log('Can\'t study sentence "' + sentence + '"')
            }
            else if (sentencesByFactIndex[highestFactIndex]) {
                sentencesByFactIndex[highestFactIndex].push(sentence)
            }
            else {
                sentencesByFactIndex[highestFactIndex] = [ sentence ]
            }
        }

        for (var factIndex = 0; factIndex < this.facts.length; factIndex++) {
            var fact = this.facts[factIndex]

            knowledge.seekToLearn(fact, factIndex)

            console.log('')
            console.log('// ' + factIndex + ' == ' + fact.toString())

            var foundSentence

            if (sentencesByFactIndex[factIndex]) {
                for (let sentence of sentencesByFactIndex[factIndex]) {
                    var studyResult = knowledge.evaluateFactSet(sentence)

                    if (!_.isEmpty(studyResult.unknownById)) {
                        throw new Error('Couldn\'t learn sentence despite order being right.')
                    }

                    var required = ''

                    if (sentence.required) {
                        var first = true

                        for (let fact of sentence.required) {
                            if (first) {
                                first = false
                            }
                            else {
                                required += ', '
                            }

                            required += 'requires:' + fact.getId()
                        }
                    }

                    console.log(sentence.toString().trim() + (required ? ' (' + required + ')' : '') + ' : ' + sentence.en().trim() )

                    knowledge.learn(studyResult, factIndex)
                }
            }

            knowledge.checkAdequateRepetition(fact, factIndex)

            if (_.keys(knowledge.studyingById) == MAX_SIMULTANEOUS_STUDY) {
                throw new Error('Reached the limit of the number of facts simultaneously studied: ' + knowledge.studying)
            }
        }

        console.log((new Date().getTime() - t) + ' ms')

        console.log('*****************************')

        console.log('Did not manage to learn:')

        _.forEach(_.keys(knowledge.studyingById), function(unlearnedFact) {
            console.log(unlearnedFact)
        })

        console.log('')
        console.log('Words defined but not in fact order:')

        var factsById = {}

        _.forEach(Word.allWords, (word) => {
            if (this.factIndexById[word.getId()] === undefined) {
                console.log(word.toString())
            }
        })
    }

})

module.exports = {
    Knowledge: Knowledge,
    FactOrder: FactOrder
}