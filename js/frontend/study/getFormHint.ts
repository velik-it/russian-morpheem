
import InflectedWord from '../../shared/InflectedWord'
import { InflectionForm, CASES, FORMS, Tense, Number, Gender } from '../../shared/inflection/InflectionForms'

import Fact from '../../shared/fact/Fact'
import Word from '../../shared/Word'

import StudyWord from './StudyWord'
import StudyPhrase from './StudyPhrase'

function isStudiedWord(word: StudyWord, studiedFacts: Fact[]) {
    return !!studiedFacts.find((studiedFact) => 
        !!word.facts.find((f) => {
            if (f.fact.getId() == studiedFact.getId()) {
                return true
            }
        })
    )
}

export default function getFormHint(forWord: Word, words: StudyWord[], studiedFacts: Fact[]): string {
    if (forWord instanceof InflectedWord) {
        let form = FORMS[forWord.form]

        if (!form) {
            console.warn(`Unknown form ${ forWord.form }.`)
            return ''
        }

        let targetTense = form.tense
        let targetNumber = form.number

        let targetGender = form.gender

        let tenseHintNeeded = !!targetTense
        let numberHintNeeded = !!targetNumber

        // we will need to know the gender of nouns for this to work, we don't yet.
        let genderHintNeeded = false


        words.forEach((word) => {

            if (word.form) {
                let wordFact = word.wordFact

                if (isStudiedWord(word, studiedFacts)) {
                    return 
                }

                let form = word.form

                if (tenseHintNeeded && form.tense != null && form.tense == targetTense) {
                    tenseHintNeeded = false
                }

                if (numberHintNeeded && form.number != null && form.number == targetNumber) {
                    numberHintNeeded = false
                }

                if (genderHintNeeded && form.gender != null && form.gender == targetGender) {
                    genderHintNeeded = false
                }
            }

        })

        let result = ''

        if (tenseHintNeeded) {
            result += (targetTense == Tense.PAST ? 'past' : 'present') 
        }

        if (numberHintNeeded) {
            if (result) {
                result += ', '
            }
            result += (targetNumber == Number.PLURAL ? 'plural' : 'singular') 
        }

        if (genderHintNeeded) {
            if (result) {
                result += ', '
            }

            result += (targetGender == Gender.M ? 'masculine' : (targetGender == Gender.N ? 'neuter' : 'feminine')) 
        }

        if (form.command) {
            if (result) {
                result += ', '
            }

            result += 'imperative' 
        }

        return result         
    }
}