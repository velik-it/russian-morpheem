/// <reference path="../../typings/react/react.d.ts" />

import {Component, cloneElement, createElement} from 'react';
import FactComponent from './FactComponent';
import Tab from './Tab';
import Fact from '../shared/fact/Fact';
import Corpus from '../shared/Corpus';
import Word from '../shared/Word';
import InflectedWord from '../shared/InflectedWord';
import InflectableWord from '../shared/InflectableWord';
import NoSuchWordError from '../shared/NoSuchWordError'
import { NotInflectedError } from '../shared/inflection/Inflections';

let React = { createElement: createElement }

interface Props {
    corpus: Corpus,
    onClose: () => any,
    tab: Tab
}

interface State {
    word?: string,
    inflection?: string
}

export default class AddWordComponent extends Component<Props, State> {
    word: HTMLInputElement

    constructor(props) {
        super(props)
        
        this.state = { word: '' }     
    }
    
    componentDidMount() {
        this.word.focus();
    }
    
    openFact(word: Fact) {
        this.props.tab.openTab(
            <FactComponent fact={ word } corpus={ this.props.corpus } tab={ null }/>,
            word.toString(),
            word.getId()
        )
    }
    
    submit() {
        let corpus = this.props.corpus
        let wordString = this.state.word
        
        if (wordString) {
            let existingFact = corpus.facts.get(wordString)
            
            if (existingFact) {
                this.openFact(existingFact)

                return
            }
            
            corpus.inflections.generateInflectionForWord(wordString, corpus)
                .catch((e) => {
                    if (e instanceof NoSuchWordError || e instanceof NotInflectedError) {
                        let word = new Word(wordString)
                        
                        corpus.words.addWord(word)
                        corpus.facts.add(word)

                        this.openFact(word)

                        this.props.onClose();
                        this.word.value = ''
                    }
                    else {
                        alert('Something went wrong: ' + e)
                    }
                })
                .then((inflection) => {
                    if (!inflection) {
                        return
                    }
                    
                    let word = new InflectableWord(inflection.stem, inflection.inflection)

                    corpus.words.addInflectableWord(word)
                    corpus.facts.add(word)

                    this.openFact(word)
                                    
                    this.props.onClose();
                    this.word.value = ''
                })
        }

    }
    
    render() {
        return <div className='addWord'>
            <input type='text' autoCapitalize='off' 
                ref={ (input) => this.word = input }
                onChange={ (event) => {
                        let target = event.target

                        if (target instanceof HTMLInputElement) {                        
                            this.setState({ word: target.value })
                        }
                    }
                }
                onKeyPress={ (event) => {                    
                    if (event.charCode == 13) {
                        this.submit() 
                    }}
                } />
            
            <div className='button' onClick={ () => this.submit() }>Add</div>
        </div>;
    }
}