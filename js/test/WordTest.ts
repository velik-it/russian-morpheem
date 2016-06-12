/// <reference path="./mocha.d.ts" />
/// <reference path="./chai.d.ts" />

import Inflection from '../shared/Inflection'
import Inflections from '../shared/Inflections'
import Word from '../shared/Word'
import Ending from '../shared/Ending'
import UnstudiedWord from '../shared/UnstudiedWord'
import InflectableWord from '../shared/InflectableWord'
import { parseEndings } from '../shared/InflectionsFileParser'

import { expect } from 'chai';

let inflections = new Inflections([
    new Inflection('infl', 'nom', null, parseEndings('nom: ium', 'fake').endings)
])

describe('Word', function() {
    it('converts unstudied to JSON and back', function () {
        let before = new UnstudiedWord('foo', 'bar').setEnglish('eng')
        let after = Word.fromJson(before.toJson(), inflections);
        
        expect(after).to.be.instanceOf(UnstudiedWord)
        
        expect(after.classifier).to.equal(before.classifier)
        expect(after.jp).to.equal(before.jp)
        expect(after.getEnglish()).to.equal(before.getEnglish())
    })
    
    it('converts studied to JSON and back', function () {
        let before = new Word('foo', 'bar').setEnglish('eng')
        let after = Word.fromJson(before.toJson(), inflections);

        expect(after).to.be.instanceOf(Word)

        expect(after.classifier).to.equal(before.classifier)
        expect(after.jp).to.equal(before.jp)
        expect(after.getEnglish()).to.equal(before.getEnglish())
    })
    
    it('converts inflectable to JSON and back', function () {
        let before = new InflectableWord('foo', inflections.inflections[0])
            .setEnglish('eng')
            .setClassifier('classified')

        let after = InflectableWord.fromJson(before.toJson(), inflections);
        
        expect(after).to.be.instanceOf(InflectableWord)
        
        expect(after.classifier).to.equal(before.classifier)
        expect(after.stem).to.equal(before.stem)
        expect(after.en).to.equal(before.en)
        expect(after.inflection.id).to.equal(before.inflection.id)
    })
})