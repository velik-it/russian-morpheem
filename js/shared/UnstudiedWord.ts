"use strict";

import Fact from './fact/Fact';
import Inflections from './inflection/Inflections'
import Words from './Words'

/**
 * An UnstudiedWord is a Word that is not a fact, i.e. it is not studied in its own right. Typically, all unstudied words
 * require grammar rules that represent the real knowledge required. An example might be the construct "<noun>は<noun>がある"
 * that should be explained by a single grammar rule after which no further studies for the individual particles is needed.
 *
 * Sometimes, there are multiple words that share spelling but have different meanings or should for other reasons be
 * studied separately. These are distinguished by "classifiers", e.g. there is に[loc] ("loc" being the classifier)
 * for specifying location and に[dir] for specifying direction.
 */
export default class UnstudiedWord {
    en: any
    required: Fact[]

    constructor(public jp: string, public classifier?: string) {
        this.jp = jp
        this.classifier = classifier
        this.en = { }
    }

    related(fact) {
        // unused for now

        return this
    }

    requiresFact(fact) {
        if (!fact) {
            throw new Error('No fact.')
        }

        if (!this.required) {
            this.required = []
        }

        this.required.push(fact)

        return this
    }

    getId() {
        let result = this.jp 
        
        if (this.classifier) {
            result += '[' + this.classifier + ']' 
        }
        
        return result
    }

    visitFacts(visitor) {
        this.visitRequired(visitor)
    }

    visitRequired(visitor) {
        if (this.required) {
            for (let fact of this.required) {
                if (fact.visitFacts) {
                    fact.visitFacts(visitor)
                }
                else {
                    visitor(fact)
                }
            }
        }
    }

    getEnglish(form?) {
        if (!form) {
            form = ''
        }

        var result = this.en[form]

        if (!result) {
            if (form == '') {
                return ''
            }
            
            throw new Error('Form ' + form + ' not present among English translations of "' + this + '", only ' + Object.keys(this.en))
        }

        return result
    }

    setEnglish(en, form?) {
        if (!form) {
            form = ''
        }

        this.en[form] = en

        return this
    }

    toString() {
        return this.jp
    }
    
    static fromJson(json, inflections: Inflections): UnstudiedWord {
        return new UnstudiedWord(json.target, json.classifier).setEnglish(json.en)
    }
    
    toJson(): any {
        return {
            target: this.jp,
            en: this.en[''],
            classifier: this.classifier,
            type: this.getJsonType()
        }
    }
    
    getJsonType() {
        return 'unstudied'
    }

    toUnambiguousString(words: Words) {
        let disambiguation = this.getDisambiguation(words)

        return this.jp + (disambiguation ? 
            ' [' + disambiguation + ']' : '')
    }

    getDisambiguation(words: Words) {
        let homonyms = words.ambiguousForms[this.jp]

        if (homonyms) {
            let form

            if (!homonyms.find((otherWord) => otherWord.classifier == this.classifier)) {
                form = this.classifier
            }
            else {
                form = (this.classifier ? this.classifier : 'uninfl.')
            }
        }
    } 
}
