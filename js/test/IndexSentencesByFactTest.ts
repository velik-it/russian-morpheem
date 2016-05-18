/// <reference path="./mocha.d.ts" />
/// <reference path="./chai.d.ts" />

import { findSentencesForFact, indexSentencesByFact } from '../shared/IndexSentencesByFact'

import Inflections from '../shared/Inflections'
import Inflection from '../shared/Inflection'
import InflectedWord from '../shared/InflectedWord'
import readCorpus from '../backend/CorpusReader';
import Sentence from '../shared/Sentence'
import Sentences from '../shared/Sentences'
import Words from '../shared/Words'
import Word from '../shared/Word'
import Facts from '../shared/Facts'

import { expect } from 'chai';

describe('IndexSentencesByFact', function() {
    let inflection = new Inflection('verb', 'inf', null, { inf: 're', i: 'vo' })
    
    let io = new Word('io')
    let bere = new InflectedWord('bere', null, 'inf').setInflection(inflection)
    let bevo = new InflectedWord('bevo', bere, 'i').setInflection(inflection)
    
    let facts = new Facts()
    facts.add(io)
    facts.add(inflection.getFact('inf'))
    facts.add(bere)
    facts.add(inflection.getFact('i'))
    
    let words = new Words().add(bere).add(io)
    
    let sentences = new Sentences()
    sentences.add(new Sentence([ io, bevo ], 1))
    sentences.add(new Sentence([ bere ], 2))

    it('finds sentences by fact', function () {
        
        let fs = findSentencesForFact(bere, sentences, facts, 0)
        
        expect(fs.easy.length).to.equal(1)
        expect(fs.hard.length).to.equal(1)
        
        fs = findSentencesForFact(bere, sentences, facts, 1)
        
        expect(fs.easy.length).to.equal(1)
        expect(fs.ok.length).to.equal(1)
    })

    it('indexes all sentences by fact', function () {
        let index = indexSentencesByFact(sentences, facts, 0)

        expect(index[ io.getId() ].easy).to.equal(0)
        expect(index[ io.getId() ].hard).to.equal(1)
        
        expect(index[ bere.getId() ].easy).to.equal(1)
        expect(index[ bere.getId() ].hard).to.equal(1)
        
        expect(index[ inflection.getFact('inf').getId() ].hard).to.equal(1)
        expect(index[ inflection.getFact('inf').getId() ].easy).to.equal(0)

        index = indexSentencesByFact(sentences, facts, 1)

        expect(index[ bere.getId() ].ok).to.equal(1)

    })

    it('works on real data', function (done) {
        readCorpus().then((corpus) => {
            indexSentencesByFact(corpus.sentences, corpus.facts)
            
            done()
        })
        .catch((e) => {
            done(e)
        })        
    })
})