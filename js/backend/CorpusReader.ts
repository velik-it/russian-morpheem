'use strict'

import readInflectionFile from './InflectionFileReader';
import readFactFile from './FactFileReader';
import SentenceFileReader from './SentenceFileReader';
import UnstudiedWord from '../shared/UnstudiedWord';
import Facts from '../shared/Facts';
import Corpus from '../shared/Corpus';
import Words from '../shared/Words';
import Sentence from '../shared/Sentence';
import Inflections from '../shared/Inflections';

var corpusDir = '../../public/corpus/russian'

export default function readCorpus() {
    return readInflectionFile(corpusDir + '/inflections.txt')
    .then((inflections: Inflections) => {
        return readFactFile(corpusDir + '/facts.txt', inflections)        
            .then((facts: Facts) => {
                let words = new Words(facts);                

                words.add(new UnstudiedWord('?', null))
                words.add(new UnstudiedWord('"WhatsApp"', null))

                return SentenceFileReader(corpusDir + '/sentences.txt', words, facts)
                .then((sentences: Sentence[]) => {
                    return new Corpus(inflections, words, sentences, facts)
                })
            })
    })
}