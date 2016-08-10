
import WordMatch from './WordMatch'
import WildcardMatch from './WildcardMatch'
import { ExactWordMatch, AnyWord } from './ExactWordMatch'
import PosFormWordMatch from './PosFormWordMatch'
import WordInFormMatch from './WordInFormMatch'
import { POS_NAMES } from './PosFormWordMatch'
import TagWordMatch from './TagWordMatch'
import { QUANTIFIERS } from './AbstractQuantifierMatch'
import Words from '../Words'
import Inflections from '../inflection/Inflections'
import Facts from '../fact/Facts'
import Word from '../Word'
import { ENGLISH_FORMS_BY_POS, FORMS, GrammaticalCase } from '../inflection/InflectionForms'
import InflectableWord from '../InflectableWord'
import InflectedWord from '../InflectedWord'
import EnglishPatternFragment from './EnglishPatternFragment'
import PhraseMatch from './PhraseMatch'
import Corpus from '../Corpus'

export enum CaseStudy {
    STUDY_CASE, STUDY_WORDS, STUDY_BOTH
}

export interface JsonFormat {
    pattern: string,
    en: string
}

export interface Match {
    words: WordMatched[]
    pattern: PhrasePattern
}

export interface WordMatched {
    wordMatch: WordMatch
    word: Word
    index: number
}

export default class PhrasePattern {
    constructor(public wordMatches: WordMatch[], public en: string) {
        this.wordMatches = wordMatches
        this.en = en
    }

    match(words: Word[], facts: Facts, caseStudy?: CaseStudy, onlyFirstWord?: boolean): Match {
        if (caseStudy == null) {
            caseStudy = CaseStudy.STUDY_BOTH
        }

        let minWords = this.wordMatches.length

        this.wordMatches.forEach((m) => {
            if (m.allowEmptyMatch()) {
                minWords--
            }
        })

        let until = (onlyFirstWord ? 0 : words.length - minWords)

        for (let i = 0; i <= until; i++) {
            let at = i
            let found = true
            let wordsMatched: WordMatched[] = []

            for (let j = 0; j < this.wordMatches.length; j++) {
                let wordMatch = this.wordMatches[j]

                let match = wordMatch.matches(words, at, this.wordMatches, j)

                if (!match && !wordMatch.allowEmptyMatch()) {
                    found = false
                    break
                }

                if (!(wordMatch instanceof WildcardMatch) &&
                    (caseStudy == CaseStudy.STUDY_BOTH || 
                     wordMatch.isCaseStudy() == (caseStudy == CaseStudy.STUDY_CASE))) {
                    for (let i = 0; i < match; i++) {
                        wordsMatched.push({
                            index: at+i,
                            word: words[at+i],
                            wordMatch: wordMatch
                        })
                    }
                }

                at += match
            }

            if (found && wordsMatched.length) {
                return {
                    words: wordsMatched,
                    pattern: this
                }
            }
        }
    }

    getEnglishFragments(): EnglishPatternFragment[] {
        let split = this.en.match(/(\[[^\]]+\]|[^\[]+)/g)
        let placeholderCount = 0

        let result: EnglishPatternFragment[] = []
        
        if (!split) {
            return result
        }

        split.map((str) => {
            str.split('...').forEach((str) => {
                str = str.trim()

                if (!str) {
                    return
                }

                let en = str

                let placeholder = str[0] == '['
                let placeholderIndex = placeholderCount

                if (placeholder) {
                    en = str.substr(1, str.length-2)

                    placeholderCount++
                }

                result.push({
                    placeholder: placeholder,
                    enWithJpForCases: (match: Match) => {
                        
                        if (placeholder) {
                            let atCaseStudyIndex = -1
                            let atWordMatch 

                            let m: WordMatched[] = match.words.filter((m) => {
                                let wordMatch = m.wordMatch

                                if (wordMatch.isCaseStudy()) {
                                    if (wordMatch != atWordMatch) {
                                        atCaseStudyIndex++

                                        atWordMatch = wordMatch 
                                    }

                                    return atCaseStudyIndex == placeholderIndex
                                } 
                            })

                            if (!m.length) {
                                console.log(`Placeholders didn't match case studies in pattern "${this.toString()}"`)

                                return en
                            }

                            return m.map((wordMatched) => {
                                let placeholderWord = wordMatched.word
                                
                                if (placeholderWord instanceof InflectedWord) {
                                    return placeholderWord.word.getDefaultInflection().jp 
                                }
                                else {
                                    return placeholderWord.jp
                                }
                            }).join(' ')
                        }
                        else {
                            let replace: { [key: string]: Word[]} = {}

                            match.words.forEach((m) => {
                                let mStr = m.wordMatch.toString()

                                if (en.indexOf(mStr) >= 0) {
                                    let r = replace[mStr]

                                    if (!r) {
                                        r = []
                                        replace[mStr] = r
                                    }

                                    r.push(m.word)
                                }
                            })

                            Object.keys(replace).forEach((r) => {
                                en = en.replace(new RegExp(r, 'g'), replace[r].map((w) => 
                                    (w instanceof InflectedWord ? w.word.getDefaultInflection().jp : w.jp)
                                ).join(' '))
                            })

                            return en                                     
                        }

                    },
                    en: (match: Match) => {
                        let placeholders = en.match(/\(([^)]*)\)/g) || []

                        placeholders.forEach(placeholder => {
                            let params = placeholder.substr(1, placeholder.length-2).split(',')

                            if (!params.length) {
                                console.warn(`Empty placeholder in phrase translated as ${en}.`)
                                return
                            }

                            let flags = params[params.length-1].split('->')
                            
                            let words: InflectedWord[]
                            
                            let agreeWithPoSorCase = flags[0]

                            let inflectAsPoS

                            let fragmentIndex
                            let agreeWithForm
                            let agreeWithPoS

                            {
                                let els = agreeWithPoSorCase.split('@') 

                                if (els.length > 1) {
                                    agreeWithForm = FORMS[els[1]]
                                    agreeWithPoS = els[0]
                                }
                            }

                            if (parseInt(agreeWithPoSorCase)) {
                                fragmentIndex = parseInt(agreeWithPoSorCase)
                            }
                            else {
                                agreeWithForm = FORMS[agreeWithPoSorCase]

                                if (!agreeWithForm) {
                                    agreeWithPoS = agreeWithPoSorCase
                                }
                            }

                            if (fragmentIndex) {
                                let at = 0
                                let lastMatch
                                words = []

                                match.words.forEach((w) => {

                                    if (w.wordMatch != lastMatch) {
                                        at++
                                        lastMatch = w.wordMatch
                                    }

                                    let word = w.word 

                                    if (at == fragmentIndex && word instanceof InflectedWord) {
                                        words.push(word)
                                    }
                                })

                            }
                            else {
                                words = match.words.map(m => m.word as InflectedWord)
                            }

                            if (agreeWithForm) {
                                words = words.filter(word => {
                                    return word instanceof InflectedWord && agreeWithForm.matches(FORMS[word.form])
                                })

                                if (!words.length) {
                                    console.warn(`No words with form ${agreeWithForm.id} in phrase translated as ${en}`)
                                }
                            }

                            if (agreeWithPoS) {
                                words = words.filter(word => word.pos == agreeWithPoS)

                                if (!words.length) {
                                    console.warn(`No words matching PoS ${agreeWithPoS} in phrase translated as ${en}`)
                                }
                            }

                            if (flags.length > 1) {
                                inflectAsPoS = flags[1]
                            }
                            else if (agreeWithPoS) {
                                inflectAsPoS = agreeWithPoS
                            }
                            else {
                                console.warn(`When agreeing with a case, PoS of forms must be specified in phrase translated as ${en}`)
                                inflectAsPoS = 'v'
                            }

                            let replaceWith = '' 

                            if (params.length == 1) {
                                replaceWith = words.map(w => w.getEnglish()).join(' ')
                            }
                            else if (words.length) {
                                let inflections = params.slice(0, params.length-1)

                                let en: { [ form: string ]: string } = {}

                                en[''] = params[0]

                                ENGLISH_FORMS_BY_POS[inflectAsPoS].allForms.map((form, index) => {
                                    let inflection = inflections[index+1]

                                    if (!inflection) {
                                        return
                                    }

                                    let els = inflection.split(':')

                                    if (els.length == 2) {
                                        en[els[0]] = els[1].trim()
                                    }
                                    else {
                                        en[form] = inflections[index+1]
                                    }
                                })

                                let englishForm = InflectedWord.getEnglishForm(inflectAsPoS, words[0].form, en)

                                replaceWith = en[englishForm] || en['']

                                if (englishForm == 'inf') {
                                    replaceWith = 'to ' + replaceWith
                                }
                            }

                            en = en.replace(placeholder, replaceWith)
                        })

                        return en                                     
                    } 
                })
            })
        })

        return result
    }

    setCorpus(corpus: Corpus) {
        this.wordMatches.forEach((m) => m.setCorpus(corpus))
    }

    hasCase(grammaticalCase: GrammaticalCase): boolean {
        return !!this.wordMatches.find((m) => (m as any).form && (m as any).form.grammaticalCase == grammaticalCase)
    }

    static parseFormMatch(str: string, line: string) {
        let quantifier

        if (QUANTIFIERS[str[str.length - 1]]) {
            quantifier = str[str.length - 1]
            str = str.substr(0, str.length-1)
        }

        let split = str.split('@')

        let formStr = split[1]

        if (formStr == '') {
            formStr = null
        }

        if (formStr && !FORMS[formStr]) {
            throw new Error(`Unknown form "${formStr}" on line "${line}". Should be one of ${ Object.keys(FORMS).join(', ') }.`)
        }

        let posStr = split[0]

        if (posStr == '') {
            posStr = null
        }

        if (posStr && !POS_NAMES[posStr]) {
            throw new Error(`Unknown part of speech "${posStr}" on line "${line}". Should be one of ${ Object.keys(POS_NAMES).join(', ') }.`)
        }

        return new PosFormWordMatch(posStr, FORMS[formStr], formStr, quantifier)
    }

    static fromString(line: string, en: string, words: Words, inflections: Inflections) {
        let wordMatches: WordMatch[] = []
        
        line.split(' ').forEach((str) => {
            if (!str) {
                return
            }

            let match: WordMatch

            if (str.indexOf('@') == 0 || (str.indexOf('@') > 0 && POS_NAMES[str.substr(0, str.indexOf('@'))])) {
                match = this.parseFormMatch(str, line)
            }
            else if (FORMS[str]) {
                match = new PosFormWordMatch(null, FORMS[str], str, null)
            }
            else if (POS_NAMES[str]) {
                match = new PosFormWordMatch(str, null, null, null)
            }
            else if (POS_NAMES[str.substr(0, str.length-1)] && QUANTIFIERS[str[str.length-1]]) {
                match = new PosFormWordMatch(str.substr(0, str.length-1), null, null, str[str.length-1])
            }
            else if (str.substr(0, 7) == 'phrase:') {
    	        match = new PhraseMatch(str.substr(7))
            }
            else if (str.substr(0, 4) == 'tag:') {
                let els = str.substr(4).split('@')

                let tagStr = els[0]

                let form 
                
                if (els[1]) {
                    form = FORMS[els[1]]

                    if (!form) {
                        throw new Error(`"${ els[1] } was not recognized as a form. Valid forms are: ${ Object.keys(FORMS).join(', ') }.`)
                    }
                }

    	        match = new TagWordMatch(tagStr, form)
            }
            else if (str == 'any') {
                match = new WildcardMatch()
            }
            else if (str.indexOf('@') > 0 || str.indexOf('|') >= 0 || words.inflectableWordsById[str] || words.get(str)) {
                let wordStr
                let word: AnyWord
                
                if (str.indexOf('@') < 0) {
                    str += '@'
                }

                if (str[str.length-1] == '@') {
                    wordStr = str.substr(0, str.length-1)
                    
                    let wordList: AnyWord[] = wordStr.split('|').map((w) => {
                        let result: AnyWord = words.inflectableWordsById[w]

                        if (!result) {
                            result = words.get(w)
                        }
                        
                        if (!result) {
                            throw new Error(`Unknown word "${w}". Did you mean ${ words.getSimilarTo(w).join(', ') }?`)
                        }

                        return result
                    })

                    match = new ExactWordMatch(wordList)
                }
                else {
                    wordStr = str

                    word = words.get(wordStr)

                    if (!word) {
                        let wordForm = str.split('@')

                        let wordList: InflectableWord[] = wordForm[0].split('|').map((w) => {
                            let result = words.inflectableWordsById[w]

                            if (!result) {
                                throw new Error(`Unknown word "${w}". Did you mean ${ words.getSimilarTo(w).join(', ') }?`)
                            }

                            return result
                        })

                        let form = FORMS[wordForm[1]]

                        if (!form) {
                            throw new Error(`Unknown form ${wordForm[1]} of word ${wordForm[0]}. Valid forms are: ${ Object.keys(FORMS).join(', ') }.`)
                        }

                        match = new WordInFormMatch(wordList, form)
                    }
                    else {
                        if (!word) {
                            throw new Error(`Unknown word "${ wordStr }". Did you mean ${ words.getSimilarTo(wordStr).join(', ') }?`)
                        }

                        match = new ExactWordMatch([ word ])
                    }
                }
            }
            else {
                throw new Error(`Unknown word match "${str}". Should either be a form, a part of speech (${ Object.keys(POS_NAMES).join(', ')}), 'any', word@, 'tag:tagName' or 'tag:tagName@case'. Type '@form' to see all forms.`)
            }

            wordMatches.push(match)
        })

        return new PhrasePattern(wordMatches, en)
    }

    toJson(): JsonFormat {
        return {
            pattern: this.toString(),
            en: this.en
        }
    }

    static fromJson(json: JsonFormat, words: Words, inflections: Inflections) {
        return PhrasePattern.fromString(json.pattern, json.en, words, inflections)
    }

    toString() {
        return this.wordMatches.map((wm) => wm.toString()).join(' ')
    }

}