/// <reference path="../../typings/react/react.d.ts" />

import Corpus from '../shared/Corpus'
import Fact from '../shared/Fact'
import Word from '../shared/Word'
import Words from '../shared/Words'
import InflectedWord from '../shared/InflectedWord'
import Sentence from '../shared/Sentence'
import { MISSING_INDEX } from '../shared/Facts'
import Tab from './Tab'

import FactNameComponent from './FactNameComponent'
import WordSearchComponent from './WordSearchComponent'
import FactComponent from './FactComponent'
import SentenceEditorComponent from './SentenceEditorComponent'
import SentenceHistoryComponent from './metadata/SentenceHistoryComponent'
import SentenceStatusComponent from './metadata/SentenceStatusComponent'
import SentenceTranslationComponent from './SentenceTranslationComponent'

import { Component, createElement } from 'react'

interface Props {
    corpus: Corpus,
    sentence: Sentence,
    tab: Tab
}

interface State {
    sentence?: Sentence
}

let React = { createElement: createElement }

interface FactIndex {
    index: number,
    fact: Fact
}

function randomInt() {
    return Math.floor(Math.random() * Number.MAX_SAFE_INTEGER)
}

export default class SentenceComponent extends Component<Props, State> {
    constructor(props) {
        super(props)
        
        this.state = {
            sentence: props.sentence
        }
    }
    
    duplicate() {
        let sentence = new Sentence(this.props.sentence.words.slice(0), null).setEnglish(this.props.sentence.en())

        this.props.corpus.sentences.add(sentence)

        this.props.tab.openTab(
            <SentenceComponent sentence={ sentence } corpus={ this.props.corpus } tab={ null } />, 
            sentence.toString(), sentence.getId().toString())
    }

    delete() {
        let sentence = new Sentence(this.props.sentence.words, randomInt())
            .setEnglish(this.props.sentence.en())

        this.props.corpus.sentences.remove(this.props.sentence)
        
        this.props.tab.close()
    }
        
    render() {
        let factsById = {}
        
        this.state.sentence.visitFacts((fact: Fact) => {
            factsById[fact.getId()] = fact
        })
        
        let sortedFacts: FactIndex[] = []

        for (let id in factsById) {
            let fact = factsById[id]

            let index = this.props.corpus.facts.indexOf(fact)

            if (index < 0) {
                index = 99999
            }

            sortedFacts.push({
                index: index,
                fact: fact
            })
        }

        sortedFacts = sortedFacts.sort((f1, f2) => f1.index - f2.index)

        let openFact = (fact: Fact) => {
            this.props.tab.openTab(
                <FactComponent
                    corpus={ this.props.corpus }
                    fact={ fact }
                    tab={ this.props.tab } 
                />, 
                fact.getId(), 
                fact.getId())
        }

        let factIndexToElement = (factIndex : FactIndex) => 
            <li key={ factIndex.fact.getId() } className='clickable' onClick={ () => openFact(factIndex.fact) }>

                <div className={ 'index' + (factIndex.index == MISSING_INDEX ? ' missing' : '') }>
                    <div className='number' >
                        { factIndex.index == MISSING_INDEX ? 'n/a' : factIndex.index + 1 }
                    </div>
                </div>

                <FactNameComponent fact={ factIndex.fact } index={ factIndex.index } corpus={ this.props.corpus} />
            </li>

        let editor: SentenceEditorComponent
        let wordSearch: WordSearchComponent

        return (<div>
            <div className='buttonBar right'>
                <div className='button' onClick={ () => this.duplicate() }>Duplicate</div>
                <div className='button' onClick={ () => this.delete() }>Delete</div>                
            </div>
            <div className='buttonBar'>
                {
                    Words.PUNCTUATION.split('').map((char) => 
                        <div className='button' key={ char } onClick={ () => editor.setWord(
                            this.props.corpus.words.get(char)
                        ) }>{ char }</div>
                    ) 
                }
            </div>

            <SentenceEditorComponent
                corpus={ this.props.corpus } 
                words={ this.props.sentence.words }
                onWordSelect={ (word: Word) => {
                    if (word instanceof InflectedWord) {
                        wordSearch.setWord(word.word) 
                    }
                } }
                ref={ (ref) => { editor = ref } }
                onSentenceChange={ (words: Word[]) => {
                    let sentence = new Sentence(words, this.state.sentence.id)

                    this.setState({ sentence: sentence })

                    this.props.corpus.sentences.store(sentence)
                    
                    // todo: this doesn't update the tab. flux?
                    this.props.tab.name = sentence.toString();
                } }/>

            <WordSearchComponent
                corpus={ this.props.corpus } 
                tab={ this.props.tab } 
                onWordSelect={ (word) => { editor.setWord(word); wordSearch.clearFilters() } } 
                ref={ (ref) => { wordSearch = ref } }
                canFilterWord={ true }/>

            <ul className='sortedFacts'>
            {
                sortedFacts.map(factIndexToElement)
            }
            </ul>

            <SentenceStatusComponent
                corpus={ this.props.corpus }
                sentence={ this.props.sentence }
                />

            <SentenceTranslationComponent
                corpus={ this.props.corpus }
                sentence={ this.props.sentence }
                />

            <SentenceHistoryComponent 
                corpus={ this.props.corpus }
                sentence={ this.props.sentence }
                />
        </div>)
    }
}
