import { Match } from '../../phrase/Match';
import { getFileName } from '../../../backend/route/getAudio';


import { Component, createElement } from 'react'

import Corpus from '../../../shared/Corpus'

import InflectedWord from '../../../shared/InflectedWord'
import InflectableWord from '../../../shared/InflectableWord'
import AbstractAnyWord from '../../../shared/AbstractAnyWord'
import Fact from '../../../shared/fact/Fact'
import { Knowledge } from '../../../shared/study/Exposure'

import Ending from '../../../shared/Ending'
import Sentence from '../../../shared/Sentence'

import Inflection from '../../../shared/inflection/Inflection'
import { getFormName } from '../../../shared/inflection/InflectionForms' 
import { PartOfSpeech as PoS } from '../../../shared/inflection/Dimensions' 
import InflectionFact from '../../../shared/inflection/InflectionFact'
import {
    Derivation,
    getDerivations,
    getNamedForm,
    getNonRedundantNamedForms
} from '../../../shared/inflection/WordForms';

import NaiveKnowledge from '../../../shared/study/NaiveKnowledge'
import SentenceScore from '../../../shared/study/SentenceScore'
import KnowledgeSentenceSelector from '../../../shared/study/KnowledgeSentenceSelector'
import topScores from '../../../shared/study/topScores'
import Phrase from '../../../shared/phrase/Phrase'
import findPhrasesWithWord from '../../../shared/phrase/findPhrasesWithWord'

import Transform from '../../../shared/Transform'
import { EndingTransform } from '../../../shared/Transforms'

import { Factoid } from '../../../shared/metadata/Factoids'
import htmlEscape from '../../../shared/util/htmlEscape'
import Words from '../../../shared/Words'
import Word from '../../../shared/Word'
import AnyWord from '../../../shared/AnyWord'

import InflectionTableComponent from '../../../shared/guide/InflectionTableComponent'
import { renderWordInflection } from '../../../shared/guide/InflectionTableComponent'
import StudyToken from '../../study/StudyToken'
import StudyWord from '../../study/StudyWord'
import StudyPhrase from '../../study/StudyPhrase'
import toStudyWords from '../../study/toStudyWords'

import StudyFact from '../../study/StudyFact'

import { TokenizedSentence, downscoreRepeatedWord, tokensToHtml, highlightTranslation } from './exampleSentences'

import FactLinkComponent from './FactLinkComponent'
import renderRelatedFact from './renderRelatedFact'
import renderTagFacts from './renderTagFacts'

import marked = require('marked');

import { FactPivotTable, renderFactEntry } from '../pivot/PivotTableComponent'
import PhrasePrepositionDimension from '../pivot/PhrasePrepositionDimension'
import PhraseCaseDimension from '../pivot/PhraseCaseDimension'

import GroupedListComponent from '../pivot/GroupedListComponent'
import { MatchPhraseDimension, MatchTextDimension } from '../pivot/MatchTextDimension'

import { getMatchesForWord, renderMatch } from './exampleSentences'

let React = { createElement: createElement }

interface Props {
    corpus: Corpus,
    word: AbstractAnyWord,
    knowledge: NaiveKnowledge,
    factLinkComponent: FactLinkComponent
}

interface State {
    sentences?: TokenizedSentence[]
}

export default class WordFactComponent extends Component<Props, State> {
    constructor(props) {
        super(props)

        this.state = { }
    }

    wordChanged(fact: Fact) {
        let corpus = this.props.corpus
        let word = this.props.word

        let sentences = corpus.sentences.getSentencesByFact(corpus.facts)[ fact.getId() ]

        let scores
        
        if (sentences) {
            scores = sentences.easy.concat(sentences.ok).concat(sentences.hard).map(ss => 
                { 
                    return {
                        sentence: ss.sentence,
                        fact: fact,
                        score: 1
                    }    
                })

            scores = new KnowledgeSentenceSelector(this.props.knowledge).scoreSentences(scores)

            scores = downscoreRepeatedWord(scores, w => w instanceof InflectedWord && w.word == word)

            scores = topScores(scores, 12)
        }
        else {
            scores = []
        }

        let ignorePhrases = true

        this.setState({
            sentences: scores.map(s => {
                return {
                    sentence: s.sentence,
                    tokens: toStudyWords(s.sentence, [ fact ], this.props.corpus, ignorePhrases)
                }
            })
        })
    }

    componentWillReceiveProps(props) {
        if (props.word != this.props.word) {
            this.wordChanged(props.word.getWordFact())
        }
    }

    componentWillMount() {
        let fact = this.props.word.getWordFact()

        this.wordChanged(fact)
    } 


    wordsWithSimilarInflection() {
        let word = this.props.word

        if (word instanceof InflectableWord) {
            let inflection = word.inflection

            let wordsWithInflection = (inflection: Inflection, word: InflectableWord) =>
                this.props.corpus.facts.facts.filter(f =>
                    f instanceof InflectableWord && 
                    f.inflection == inflection &&
                    f.getIdWithoutClassifier() != word.getIdWithoutClassifier() &&
                    f.getDefaultInflection() != word.getDefaultInflection()
                )

            let result = wordsWithInflection(inflection, word)

            if (!result.length) {
                // try the parent
                inflection = word.inflection.inherits.find(i => i.getId().substr(0, 6) != 'abstr-')

                result = wordsWithInflection(inflection, word)
            }

            if (!result.length) {
                // find others inheriting the parent (the parent might have no direct users)
                result = this.props.corpus.facts.facts.filter(f =>
                    f instanceof InflectableWord && 
                    f.inflection.inherits.indexOf(inflection) >= 0 &&
                    f.getIdWithoutClassifier() != word.getIdWithoutClassifier() &&
                    f.getDefaultInflection() != (word as InflectableWord).getDefaultInflection()
                )
            }

            return sortByKnowledge(result, this.props.knowledge).slice(0, 5)
        }
    }

    getSentences() {
        let corpus = this.props.corpus
        let word = this.props.word

        let matches = getMatchesForWord(word, this.props.knowledge, corpus)

        class MatchListComponent extends GroupedListComponent<Match> {
        }

        let dimensions = [ 
            new MatchPhraseDimension(),
            new MatchTextDimension(true) 
        ]

        return <MatchListComponent
            data={ matches }
            getIdOfEntry={ (match) => match.sentence.id }
            dimensions={ dimensions }
            renderEntry={ renderMatch(word.getWordFact(), corpus, this.props.factLinkComponent) }
            renderGroup={ (entry, children, key) => <div key={ key }>
                { entry }
                <ul className='sentences'>{ children }</ul>
            </div> }
            itemsPerGroupLimit={ 3 }
            itemsLimit={ 30 }
            groupLimit={ 10 }
        />   
    }

    renderDerivations() {
        let word = this.props.word

        const DERIVATION_NAMES = {
            perf: 'perfective',
            imperf: 'imperfective',
            refl: 'reflexive',
            nonrefl: 'non-reflexive',
            adj: 'adjective',
            adv: 'adverb'
        }

        let renderDerivedWord = (derived: AnyWord, derivation: Derivation) => {
            let name = derived.getEnglish() 

            if (name == word.getEnglish()) {
                name = DERIVATION_NAMES[derivation.id] || derivation.id 
            }
            else if (DERIVATION_NAMES[derivation.id]) {
                name += ` – ${DERIVATION_NAMES[derivation.id]}` 
            }

            let content = <div className='derivation' key={ derived.getId() }>
                <div className='inner'>
                    <div>{
                        name
                    }</div>
                    <div className='word'>{ derived.toText() }</div>
                </div>
            </div>

            return React.createElement(this.props.factLinkComponent, {
                fact: derived.getWordFact(),
                key: derived.getId()
            }, content)
        }

        let res = getDerivations(word.wordForm).map(derivation =>
            word.getDerivedWords(derivation.id)
                .map(derived => renderDerivedWord(derived, derivation)))
            .reduce((a, b) => a.concat(b), [])

res.forEach(r => console.log(r.key))

        return res
    }

    render() {
        let props = this.props
        let word = props.word
        let corpus = props.corpus
        let thisIdWithoutClassifier = word.getIdWithoutClassifier() 

        let factoid = props.corpus.factoids.getFactoid(props.word.getWordFact())

        let otherMeanings = corpus.facts.facts.filter(fact => 
            { 
                if (fact instanceof InflectableWord || fact instanceof Word) {
                    return fact.getIdWithoutClassifier() == thisIdWithoutClassifier &&
                        fact.getId() != word.getId()
                }
            })

        let related = 
            (word.required || [])
            .concat(factoid ? 
                factoid.relations.map(f => corpus.facts.get(f.fact)).filter(f => !!f) 
                : 
                [])

        let posSpecific = null

        let phrasesWithWord = findPhrasesWithWord(word, corpus)
        
        if (word.wordForm.pos == PoS.PREPOSITION) {
            posSpecific = <div>
                <h3>Phrases</h3>

                { props.word.toText() } is used in the following phrases with the following cases:

                <FactPivotTable
                    data={ phrasesWithWord }
                    getIdOfEntry={ (f) => f.getId() }
                    renderEntry={ renderFactEntry(props.corpus, props.factLinkComponent) }
                    dimensions={ [ 
                        new PhraseCaseDimension(props.factLinkComponent), 
                    ] }
                />
            </div>
        }
        else {
            related = related.concat(
                sortByKnowledge(phrasesWithWord, props.knowledge))
        }

        return <div className='fact wordFact'>
            <h1>{ word.toText() }</h1>
            <h2>{ word.getEnglish((word.wordForm.pos == PoS.VERB ? 'inf' : '')) }</h2>

            { renderTagFacts(word.getWordFact(), corpus, 
                props.factLinkComponent, getNonRedundantNamedForms(word.wordForm)) }

            { this.renderDerivations() }

            {
                factoid ? 
                    <div className='factoid' 
                        dangerouslySetInnerHTML={ { __html: marked(factoid.explanation) } }/>
                :
                    null 
            }

            <div>
                { 
                    otherMeanings.length ?
                    <div className='otherMeanings'>
                        It can also mean {
                            otherMeanings.map((fact, index) =>
                                <span key={ fact.getId() }>{ index > 0 ? ' or ' : ''}<span 
                                    className='clickable'>{
                                        React.createElement(props.factLinkComponent, 
                                            { fact: fact }, 
                                            (fact as Word).getEnglish())
                                    }</span>
                                </span>)
                        }
                    </div>
                    :
                    null
                }

            </div>

            <div className='columns'>
                <div className='main'>
                    { 
                        posSpecific
                    }
                    <h3>Examples of usage</h3>

                    <div className='exampleSentences'>{
                        this.getSentences()
                    }
                    </div>
                </div>
                <div className='sidebar'>
                    <div>
                        <h3>See also</h3>

                        <ul>
                        {
                            related.map(fact => 
                                renderRelatedFact(fact, corpus, props.factLinkComponent) 
                            ) 
                        }
                        </ul>
                    </div>
                </div>
            </div>

            { word instanceof InflectableWord ?
                <div className='columns'>
                    <div className='main'>
                        <InflectionTableComponent
                            corpus={ props.corpus }
                            pos={ word.wordForm.pos }
                            mask={ word.mask }
                            factLinkComponent={ props.factLinkComponent }
                            renderForm={ renderWordInflection(word, this.props.corpus, 
                                (inflectedWord, form, factIndex) => {
                                return <div className='clickable' key={ form }>{
                                    React.createElement(props.factLinkComponent, 
                                        { 
                                            fact: (word as InflectableWord).inflection.getFact(form), 
                                            context: (word as InflectableWord).inflect(form) 
                                        }, 
                                        (word as InflectableWord).inflect(form).toString()) 
                                    }</div>
                            })}
                            title={ word.wordForm.pos == PoS.VERB ? 'Conjugation' : 
                                (word.wordForm.pos == PoS.NOUN ? 'Declension' : 'Forms') }
                            />
                    </div>
                    <div className='sidebar'>
                        <div>
                            <h3>Words with<br/>similar endings</h3>

                            <ul>
                            {
                                this.wordsWithSimilarInflection().map(fact => 
                                    renderRelatedFact(fact, corpus, props.factLinkComponent) 
                                ) 
                            }
                            </ul>
                        </div>
                    </div>
                </div>
                :
                null
            }
        </div>
    }
}

export function sortByKnowledge(facts: Fact[], knowledge: NaiveKnowledge) {
    let known: Fact[] = []
    let unknown: Fact[] = []

    facts.forEach(fact => {
        if (knowledge.getKnowledge(fact) == Knowledge.KNEW) {
            known.push(fact)
        }
        else {
            unknown.push(fact)
        }
    })

    return known.concat(unknown)
}
