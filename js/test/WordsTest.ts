/// <reference path="./mocha.d.ts" />
/// <reference path="./chai.d.ts" />

import Inflection from '../shared/Inflection'
import Inflections from '../shared/Inflections'
import Word from '../shared/Word'
import Words from '../shared/Words'
import Ending from '../shared/Ending'
import UnstudiedWord from '../shared/UnstudiedWord'
import InflectableWord from '../shared/InflectableWord'
import { parseEndings } from '../shared/InflectionsFileParser'

import { expect } from 'chai';

let inflections = new Inflections([
    new Inflection('infl', 'nom', null, 
        parseEndings('nom: er, past1: ais, past2: ais', 'fake').endings)
])

describe('Words', function() {
    let w1, w2: Word, w3: InflectableWord, words: Words;
    
    beforeEach(() => {        
        w1 = new UnstudiedWord('foo', 'bar').setEnglish('eng')
        w2 = new Word('fooo', 'bar').setEnglish('eng')
        w3 = new InflectableWord('pass', inflections.inflections[0])
            .setEnglish('eng')

        words = new Words().addWord(w1).addWord(w2).addInflectableWord(w3)
    })

    it('handles changing inflections', function() {
        let oldPast = words.get('passer@past1')
        
        let newInflection = new Inflection(
            'infl', 'nom', null, 
            parseEndings('nom: <ter, past1: <tais, past2: <tais', 'fake').endings)

        words.changeInflection(w3, newInflection)

        expect(w3.stem).to.equal('pass')
        expect(w3.inflection).to.equal(newInflection)
        expect(w3.getId()).to.equal('paster')
        
        expect(words.get('paster')).to.equal(w3.inflect('nom'))
        expect(words.get('passais')).to.be.undefined
        expect(oldPast.jp).to.equal('pastais')
        expect(words.get('paster@past1')).to.equal(oldPast)
        expect(words.get('passer@past1')).to.be.undefined
        expect(words.get('paster@nom').toString()).to.equal('paster')
    })

    it('retrieves all word forms', function () {
        expect(words.get('passer')).to.be.not.null
        
        try {
            words.get('passais')
            
            expect('failure').to.be.null
        }
        catch(e) {}
        
        expect(words.get('passer@nom')).to.be.not.null
        expect(words.get('passer@past1')).to.be.not.null
        expect(words.get('passer@past2')).to.be.not.null
    })

    it('converts unstudied to JSON and back', function () {
        let after = Words.fromJson(words.toJson(), inflections);

        expect(after.wordsById[w1.getId()]).to.be.instanceOf(UnstudiedWord)

        expect(after.get('passer')).to.be.not.null
        
        try {
            after.get('passais')
            
            expect('failure').to.be.null
        }
        catch(e) {}
        
        expect(after.get('passer@nom')).to.be.not.null
        expect(after.get('passer@past1')).to.be.not.null
        expect(after.get('passer@past2')).to.be.not.null
    })
})