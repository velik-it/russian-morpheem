

import { Component, createElement } from 'react'
import Corpus from '../../shared/Corpus'

import NaiveKnowledge from '../../shared/study/NaiveKnowledge'
import FixedIntervalFactSelector from '../../shared/study/FixedIntervalFactSelector'
import OldestSentenceSelector from '../../shared/study/OldestSentenceSelector'
import LastSawSentenceKnowledge from '../../shared/study/LastSawSentenceKnowledge'
import chooseHighestScoreSentence from '../../shared/study/chooseHighestScoreSentence'
import { NewFactsSelector, createNewFactsSelector } from '../../shared/study/NewFactsSelector'
import FactScore from '../../shared/study/FactScore'

import FixedIntervalFactSelectorInspectorComponent from './FixedIntervalFactSelectorInspectorComponent'
import SentenceComponent from '../SentenceComponent'
import SentenceHistoryComponent from '../metadata/SentenceHistoryComponent'
import TrivialKnowledgeInspectorComponent from './TrivialKnowledgeInspectorComponent'
import StudyPlanComponent from './StudyPlanComponent'

import sentencesForFacts from '../../shared/study/sentencesForFacts'
import topScores from '../../shared/study/topScores'

import { indexSentencesByFact, SentencesByFactIndex } from '../../shared/SentencesByFactIndex'

import InflectionFact from '../../shared/inflection/InflectionFact'
import Sentence from '../../shared/Sentence'

import { Exposure, Knowledge } from '../../shared/study/Exposure'
import FrontendExposures from './FrontendExposures'
import Fact from '../../shared/fact/Fact'
import InflectedWord from '../../shared/InflectedWord'
import InflectableWord from '../../shared/InflectableWord'
import Word from '../../shared/Word'

import StudyComponent from './StudyComponent'
import TrivialKnowledge from '../../shared/study/TrivialKnowledge'
import KnowledgeSentenceSelector from '../../shared/study/KnowledgeSentenceSelector'
import { fetchStudyPlan } from './FrontendStudentProfile'

import ExplainFormComponent  from './ExplainFormComponent'
import ForgettingStats from './ForgettingStats'

import StudentProfile from '../../shared/study/StudentProfile'
import Phrase from '../../shared/phrase/Phrase'
import PhraseCase from '../../shared/phrase/PhraseCase'
import CaseStudyMatch from '../../shared/phrase/CaseStudyMatch'
import { WordMatched } from '../../shared/phrase/Match'
import { CaseStudy } from '../../shared/phrase/PhrasePattern'
import { GrammaticalCase } from '../../shared/inflection/InflectionForms'

interface Props {
    corpus: Corpus,
    xrArgs: { [arg: string] : string }
}

interface State {
    profile?: StudentProfile
    sentence?: Sentence
    facts?: Fact[]
    showDecks?: boolean
    showComments?: boolean
    showTrivial?: boolean
    showPlan?: boolean
    edit?: boolean
    done?: boolean
}

let React = { createElement: createElement }


function isWorthStudying(fact: Fact) {
    if (fact instanceof InflectionFact) {
        return fact.form != fact.inflection.defaultForm
    }
    else if (fact instanceof Word || fact instanceof InflectableWord) {
        return fact.studied
    }
    else {
        return true
    }
}

export default class StudyContainerComponent extends Component<Props, State> {
    exposures: FrontendExposures
    knowledge: NaiveKnowledge
    sentenceKnowledge: LastSawSentenceKnowledge
    trivialKnowledge: TrivialKnowledge
    sentencesByFactIndex: SentencesByFactIndex 
    factSelector: FixedIntervalFactSelector
    newFactsSelector: NewFactsSelector

    forgettingStats: ForgettingStats

    constructor(props) {
        super(props)

        this.state = {}

        this.sentencesByFactIndex = indexSentencesByFact(props.corpus.sentences, props.corpus.facts, 0)
        this.factSelector = new FixedIntervalFactSelector(this.props.corpus.facts)
        this.knowledge = new NaiveKnowledge()
        this.trivialKnowledge = new TrivialKnowledge()
        this.exposures = new FrontendExposures(this.props.xrArgs, this.props.corpus.lang)
        this.sentenceKnowledge = new LastSawSentenceKnowledge()
        this.forgettingStats = new ForgettingStats(this.props.corpus)
    }

    chooseSentence() {
        let factScores = this.factSelector.chooseFact(new Date())

console.log('new facts', this.newFactsSelector(true).map(f => f.fact.getId() + ' ' + f.score))
console.log('repeat facts', factScores.map(f => f.fact.getId() + ' ' + f.score))

        factScores = factScores.concat(this.newFactsSelector(true))

        factScores = factScores.filter((fs) => {
            let fact = fs.fact 

            return isWorthStudying(fact)
        })

        if (!factScores.length) {
            this.setState({ sentence: null, done: true })
            return
        }

        factScores = topScores(factScores, 20)

        let sentenceScores = sentencesForFacts(factScores, this.sentencesByFactIndex)

        sentenceScores = new OldestSentenceSelector(this.sentenceKnowledge, this.props.corpus.facts)
            .scoreSentences(sentenceScores)

        sentenceScores = topScores(sentenceScores, 100)

        sentenceScores = new KnowledgeSentenceSelector(this.knowledge).scoreSentences(sentenceScores)

/*
        {
            let sentence = this.props.corpus.sentences.get(2259)

            this.knowledge.getKnowledge = (fact: Fact) => {
                return Knowledge.KNEW
            }

            this.knowledge.getKnowledgeOfId = (factId: string) => {
                return Knowledge.KNEW
            }

            this.setState({
                sentence: sentence,
                facts: this.expandFact(this.props.corpus.facts.get('работа'), sentence)
            })

            return
        }
*/

        // if studying phrases, remove any sentences that don't actually match the phrase.
        sentenceScores = sentenceScores.filter((score) => {
            let phrase: Phrase
            let fact = score.fact

            if (fact instanceof Phrase) {
                phrase = fact
            }
            
            if (fact instanceof PhraseCase) {
                phrase = fact.phrase
            }

            if (phrase && !phrase.match({ sentence: score.sentence, words: score.sentence.words, facts: this.props.corpus.facts })) {
                console.log(score.sentence + ' did not match phrase ' + phrase)
                return false
            }
            else {
                return true
            }
        })

        let sentenceScore = chooseHighestScoreSentence(sentenceScores)

        if (!sentenceScore) {
            throw new Error('No sentence could be picked.')
        }

        let sentence = sentenceScore.sentence
        let fact = sentenceScore.fact

        console.log(sentenceScore)

        this.setState({ sentence: sentence, facts: this.expandFact(fact, sentence) })
    }

    oughtToKnow(fact: Fact) {
        return this.knowledge.getKnowledge(fact) == Knowledge.KNEW ||
            this.factSelector.isStudied(fact, new Date())
    }
    
    expandFact(fact: Fact, sentence: Sentence) {
console.log('Sentence: ' + sentence.toString())

        let additionalFact: Fact

console.log('Fact ' + fact.getId())

        let studiedFacts = [ fact ]

        if (fact instanceof Phrase) {
            fact.getCaseFacts().forEach((caseFact) => {
                if (this.oughtToKnow(caseFact)) {
                    additionalFact = caseFact
                }
            })
        }
        else if (fact instanceof PhraseCase) {
            if (this.oughtToKnow(fact.phrase)) {
                additionalFact = fact.phrase
            }
        }

        if (additionalFact) {
            console.log('Additional fact ' + additionalFact.getId())

            studiedFacts.push(additionalFact)
        }

        // if we study a word or an ending but we are in fact part of a phrase, 
        // we can just as well take the whole phrase.
        if (!(fact instanceof PhraseCase) && !(fact instanceof Phrase)) {
            let wordRequiresFact = (word: Word, fact: Fact) => {
                let result = false

                word.visitFacts((visitedFact) => {
                    if (visitedFact.getId() == fact.getId()) {
                        result = true
                    }
                })

                return result
            }

            let wordsRequireFact = (words: WordMatched[], fact: Fact) => {
                return !!words.find(word => wordRequiresFact(word.word, fact))
            }

            let oughtToKnowAllFacts = (words: WordMatched[]) => {
                return !words.find(word => {
                    let oughtNotTo = false

                    word.word.visitFacts((visitedFact) => {
                        if (!this.oughtToKnow(visitedFact)) {
console.log('Did not ought to know ' + visitedFact.getId())                            
                            oughtNotTo = true
                        }
                    })

                    return oughtNotTo
                }) 
            }

            let longestPhrase: Fact
            let longestPhraseLength: number = -1

            let candidateFact = (fact: Fact, words: WordMatched[]) => {
                console.log('Candidate phrase: ' + fact.getId() + ' - ' + words.map(w => w.word.jp).join(' '))
                
                if (words.length > longestPhraseLength) {
                    longestPhrase = fact
                    longestPhraseLength = words.length
                }
            }

            sentence.phrases.forEach(phrase => {
                let match = phrase.match({ sentence: sentence, words: sentence.words, facts: this.props.corpus.facts, study: CaseStudy.STUDY_CASE })

                if (match) {
                    if (wordsRequireFact(match.words, fact) && oughtToKnowAllFacts(match.words)) {
                        candidateFact(phrase, match.words)
                    }
                    else {
                        phrase.getCaseFacts().forEach((caseFact) => {
                            let words = match.words.filter(wm => wm.wordMatch.isCaseStudy() &&
                                ((wm.wordMatch as any) as CaseStudyMatch).getCaseStudied() == caseFact.grammaticalCase)

                            if (wordsRequireFact(words, fact) && oughtToKnowAllFacts(words)) {
                                candidateFact(caseFact, words)
                            }
                        })
                    }
                }
            })

            if (longestPhrase) {
                console.log('Switching to fact ' + longestPhrase.getId())

                studiedFacts = studiedFacts.filter(f => f.getId() != fact.getId())

                studiedFacts.push(longestPhrase)
            }
        }

        return studiedFacts
    }

    studyPlanLoaded() {
        this.chooseSentence()
    }

    componentWillMount() {
        Promise.all([
            fetchStudyPlan(this.props.corpus, this.props.xrArgs),
            this.exposures.getExposures(-1)
        ]).then(result => {
            let profile = { studyPlan: result[0], knowledge: this.knowledge }
            this.newFactsSelector = createNewFactsSelector(profile, 
                this.knowledge, this.factSelector, 0.1, 10, this.props.corpus)

            this.processExposures(result[1])

            this.setState({
                profile: profile
            })

            if (!profile.studyPlan.isEmpty()) {
                this.studyPlanLoaded()
            }
            else {
                this.setState({ showPlan: true })
            }
        })
    }

    processExposures(exposures: Exposure[]) {
        this.knowledge.processExposures(exposures)
        this.sentenceKnowledge.processExposures(exposures)
        this.trivialKnowledge.processExposures(exposures)
        this.forgettingStats.processExposures(exposures)
        this.factSelector.processExposures(exposures)

//        this.forgettingStats.print()
    }

    onAnswer(exposures: Exposure[]) {
        this.exposures.registerExposures(exposures)
        this.processExposures(exposures)

        this.chooseSentence()
    }

    render() {
        let profile = this.state.profile

        if (this.state.showPlan) {
            return <StudyPlanComponent
                profile={ profile }
                corpus={ this.props.corpus }
                factSelector={ this.factSelector }
                newFactSelector={ this.newFactsSelector }
                onSubmit={ 
                    facts => {
                        profile.studyPlan.setFacts(facts, this.factSelector)
                        this.studyPlanLoaded()
                        this.setState({ showPlan: false })
                    }}
            />
        }
        else if (this.state.sentence) {
            return <div className='studyOuter'>
                <div className='study'>
                    <StudyComponent 
                        sentence={ this.state.sentence }
                        facts={ this.state.facts }
                        factSelector={ this.factSelector }
                        corpus={ this.props.corpus }
                        profile={ this.state.profile }
                        trivialKnowledge={ this.trivialKnowledge }
                        onAnswer={ (exposures) => this.onAnswer(exposures)} 
                        openPlan={ () => this.setState({ showPlan: true }) } />            
                </div>

                {
                    (this.state.showComments ?

                    <div>
                        <div className='debugButtonBar'>
                            <div className='button' onClick={ () => this.setState({ showComments: false }) }>Close</div>
                        </div>

                        <SentenceHistoryComponent 
                            corpus={ this.props.corpus }
                            sentence={ this.state.sentence }
                            commentBoxOpen={ true }
                            />
                    </div>
                        
                        :

                    <div/>)
                }

                {
                    (this.state.showTrivial ?

                    <div>
                        <div className='debugButtonBar'>
                            <div className='button' onClick={ () => this.setState({ showTrivial: false }) }>Close</div>
                        </div>

                        <TrivialKnowledgeInspectorComponent 
                            knowledge={ this.trivialKnowledge }
                            />
                    </div>
                        
                        :

                    <div/>)
                }

                {
                    (this.state.edit ?

                    <div>
                        <div className='debugButtonBar'>
                            <div className='button' onClick={ () => this.setState({ edit: false }) }>Close</div>
                        </div>

                        <SentenceComponent 
                            corpus={ this.props.corpus }
                            sentence={ this.state.sentence }
                            tab={ { openTab: () => {}, close: () => {}, getLastTabIds: () => [] } }
                            />
                    </div>
                        
                        :

                    <div/>)
                }

                {
                    (this.state.showDecks ?

                        <div>

                            <div className='debugButtonBar'>
                                <div className='button' onClick={ () => this.setState({ showDecks: false }) }>Close</div>
                            </div>

                            <FixedIntervalFactSelectorInspectorComponent 
                                knowledge={ this.factSelector }
                                corpus={ this.props.corpus } />

                        </div>

                    :

                        <div/>

                    )
                }

                {

                    (!this.state.showComments && !this.state.showDecks && !this.state.edit && !this.state.showTrivial ? 

                        <div className='debugButtonBar'>
                            <div className='button' onClick={ () => this.setState({ showComments: true }) }>
                                Comment
                            </div>
                            <div className='button' onClick={ () => this.setState({ showDecks: true }) }>
                                What am I studying?
                            </div>
                            <div className='button' onClick={ () => this.setState({ showTrivial: true }) }>
                                What do I know?
                            </div>
                            <div className='button' onClick={ () => this.setState({ edit: true }) }>
                                Edit
                            </div>
                        </div>

                    :

                        <div/>

                    )

                }
            </div>
        }
        else if (this.state.done) {
            return <div>
                <h2>Study session done.</h2>

                <div className='button' onClick={ () => {
                    this.state.profile.studyPlan.clear()

                    this.setState({ profile: profile, showPlan: true })
                }}>Start new session</div>     
            </div>
        }
        else {
            return <div/>
        }
    }

}
