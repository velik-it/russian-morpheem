/// <reference path="./xr.d.ts" />
/// <reference path="../../typings/react/react-dom.d.ts" />

import Corpus from '../shared/Corpus';
import Sentence from '../shared/Sentence';
import Fact from '../shared/Fact';

import xr from 'xr';
import TabSet from './TabSetComponent';
import {render} from 'react-dom';
import {createElement} from 'react';

let React = { createElement: createElement }

xr.get('/api/corpus')
.then((xhr) => {
    var element = document.getElementById('react-root');
    let corpus = Corpus.fromJson(xhr.data)

    corpus.sentences.onChange = (sentence: Sentence) => {
        xr.put('/api/sentence/' + sentence.getId(), sentence.toJson())        
    }

    corpus.sentences.onDelete = (sentence: Sentence) => {
        xr.del('/api/sentence/' + sentence.getId())        
    }

    corpus.sentences.onAdd = (sentence: Sentence) => {
        xr.post('/api/sentence', sentence.toJson())
            .then((res) => {
                corpus.sentences.changeId(sentence.id, res.data.id)
            })
    }

    corpus.facts.onMove = (fact: Fact, pos: number) => {
        xr.put(`/api/fact/${pos}/${fact.getId()}`, {})
    }
    
    if (element) {
        render((
            <TabSet corpus={ corpus } />
            ),
            element
        );
    }
})
