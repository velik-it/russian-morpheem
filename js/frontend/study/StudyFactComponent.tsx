/// <reference path="../../../typings/react/react.d.ts" />

import { Component, createElement, createFactory } from 'react'

import { EndingTransform } from '../../shared/Transforms'

import Word from '../../shared/Word'
import Corpus from '../../shared/Corpus'
import Fact from '../../shared/fact/Fact'
import Phrase from '../../shared/phrase/Phrase'
import PhraseCase from '../../shared/phrase/PhraseCase'
import Sentence from '../../shared/Sentence'
import InflectableWord from '../../shared/InflectableWord'

import StudyFact from './StudyFact'
import NaiveKnowledge from '../../shared/study/NaiveKnowledge'
import InflectionFact from '../../shared/inflection/InflectionFact'

import InflectionFactComponent from './InflectionFactComponent'
import EndingTransformFactComponent from './EndingTransformFactComponent'
import WordFactComponent from './WordFactComponent'
import PhraseFactComponent from './PhraseFactComponent'
import PhraseCaseComponent from './PhraseCaseComponent'
import { TranslatableFact } from './WordFactComponent'

export interface FactComponentProps<FactType> {
    knowledge: NaiveKnowledge,
    corpus: Corpus,
    studyFact: StudyFact,
    sentence: Sentence,
    fact: FactType,
    hiddenFacts: StudyFact[]
}

interface Props extends FactComponentProps<Fact> {
    onKnew: (fact: StudyFact) => void,
    known: boolean
}

let React = { createElement: createElement }

let studyFactComponent = (props: Props) => {
    let fact = props.studyFact.fact

    let content
    let explainable
    let canExplain = false

    let componentType

    if (fact instanceof InflectionFact) {
        canExplain = true

        componentType = createFactory(InflectionFactComponent)
    }
    else if (fact instanceof InflectableWord || fact instanceof Word) {
        componentType = createFactory(WordFactComponent)
    }
    else if (fact instanceof EndingTransform) {
        componentType = createFactory(EndingTransformFactComponent)
    }
    else if (fact instanceof PhraseCase) {
        componentType = createFactory(PhraseCaseComponent)
    }
    else if (fact instanceof Phrase) {
        componentType = createFactory(PhraseFactComponent)
    }

    if (!props.hiddenFacts.length) {
        canExplain = false
    }

    if (!componentType) {
        console.warn('Unhandled fact type', fact)

        componentType = () => <span>{ fact.getId() }</span>
    }

    return <li>
            <div className='content'>
                 { componentType({
                    fact: fact, 
                    corpus: props.corpus,
                    knowledge: props.knowledge,
                    sentence: props.sentence,
                    hiddenFacts: props.hiddenFacts,
                    studyFact: props.studyFact, 
                    ref: (comp) => explainable = comp
                }, []) }  
            </div>

            <div className='buttonBar'>
                { canExplain ?
                    <div className='button' onClick={ () => explainable.explain() }>Explain</div>
                    :
                    []
                }
                <div className='button iKnew' onClick={ () => props.onKnew(props.studyFact) }>{
                    !props.known ?
                        'I didn\'t know that' :
                        'I knew that'
                }</div>
            </div>
        </li>
}

export default studyFactComponent;