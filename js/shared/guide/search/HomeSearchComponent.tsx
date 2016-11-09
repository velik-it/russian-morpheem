
import { Component, createElement } from 'react'

import Corpus from '../../Corpus'
import Fact from '../../fact/Fact'
import Sentence from '../../Sentence'
import AbstractAnyWord from '../../AbstractAnyWord'
import renderRelatedFact from './../fact/renderRelatedFact'

import doesFactMatchQuery from '../../../frontend/fact/doesFactMatchQuery'
import Phrase from '../../phrase/Phrase'
import getGuideUrl from '../getGuideUrl'
import { FORMS } from '../../inflection/InflectionForms'

let React = { createElement: createElement }

interface Props {
    corpus: Corpus,
    xrArgs: { [arg: string] : string }
}

interface State {
    query: string
}

export default class HomeSearchComponent extends Component<Props, State> {
    constructor(props) {
        super(props)

        this.state = {
            query: ''
        }
    }

    documentClickListener = () => this.setState({ query: '' })

    componentWillMount() {
        document.addEventListener('click', this.documentClickListener)
    }

    componentWillUnmount() {
        document.removeEventListener('click', this.documentClickListener)
    }

    getSearchResults() {
        let facts = []
        let query = this.state.query

        if (query) {
            let corpus = this.props.corpus

            let factWeights = corpus.facts.facts
                .concat(Object.keys(FORMS).filter(f => !corpus.facts.get(f)).map(k => FORMS[k]))
                .map(f => { return { fact: f, weight: doesFactMatchQuery(f, query) } })
                .filter(fw => fw.weight > 0)
                .sort((fw1, fw2) => fw2.weight - fw1.weight)
                .slice(0, 20)

            if (factWeights.length) {
                let cutoffWeight = factWeights[0].weight * 0.4

                factWeights = factWeights.filter(fw => fw.weight >= cutoffWeight)
            }

            facts = factWeights.map(fw => fw.fact)   
        }

        return facts
    }

    renderSearchForm(results: Fact[]) {
        let query = this.state.query

        return <div id='search' onClick={ (e) => e.stopPropagation() }>
            <div className='form'>
                <input type='text' ref='input' value={ query }
                    onChange={ event => this.setState({ query: (event.target as HTMLInputElement).value })}
                    onKeyPress={ (event) => {
                        if (event.charCode == 13 && results[0]) {
                            window.location.href = getGuideUrl(results[0])
                        }
                    } }
                    onKeyUp={ (event) => {
                        if (event.keyCode == 27) {
                            this.setState({ query: '' })
                        }
                    }
                    }/>
            </div>
        </div>
    }

    renderSearchResults(facts: Fact[]) {
        let factLinkComponent = (props) => 
            <a rel={ props.fact instanceof Sentence ? 'nofollow' : '' } 
                href={ getGuideUrl(props.fact as Fact, props.context) }>{ props.children }</a> 

        let query = this.state.query

        if (query) {                
            return <div className='results'>
                {
                    facts.length ?
                        <ul>{
                            facts.map(f =>
                                renderRelatedFact(f, this.props.corpus, factLinkComponent)
                            )
                        }</ul>
                    :
                    <div className='error'>Could not find anything. Search for a word (in Russian or English), 
                        an expression or a grammatical term. 
                        <br/><br/>
                        Morpheem contains a limited vocabulary up to intermediate level.</div>
                }
            </div>
        }
        else {
            return null
        }
    }

    componentDidMount() {
        let TEXTS = [
            'speak',
            'говорите',
            'dative',
            'меня',
            'short form',
            'знакомиться'
        ]

        let current = ''
        let growing = true
        
        let atText = 0
        let target = TEXTS[atText]

        let input = this.refs['input'] as HTMLInputElement;

        let updatePlaceholder = () => {
            if (document.activeElement == input) {
                input.placeholder = ''
            }
            else {
                if (growing) {
                    current += target[current.length]

                    growing = current.length < target.length
                }
                else {
                    current = current.substr(0, current.length-1)

                    if (current.length == 0) {
                        growing = true
                        atText = (atText + 1) % TEXTS.length
                        target = TEXTS[atText]
                    }
                }

                input.placeholder = 'try searching, e.g. ' + current + '|'
            }

            setTimeout(updatePlaceholder, 300)
        }

        updatePlaceholder()
    }

    render() {
        let results = this.getSearchResults();


        return <div>
            <div id="upper">
                <h1>Morpheem teaches<br/>you Russian</h1>
                <h3>It contains all the grammar, vocabulary and<br/>
                expressions you need to get to intermediate level.</h3>

                { this.renderSearchForm(results) }
            </div>
            <div id="lower">
                { this.renderSearchResults(results) }
            </div>
        </div>
    }
}