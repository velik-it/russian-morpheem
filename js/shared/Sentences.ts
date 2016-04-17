
import Sentence from './Sentence';
import Facts from './Facts';
import Words from './Words';

export default class Sentences {
    sentenceById : { [id: number]: Sentence } = {}
    sentences : Sentence[] = []

    changedIdByOldId : { [id: number]: number } = {}

    onAdd: (sentence: Sentence) => void = null
    onChange: (sentence: Sentence) => void = null

    nextSentenceId: number = 0

    constructor() {
    }

    changeId(fromId: number, toId: number) {
        let sentence = this.sentenceById[fromId]
        
        if (!sentence) {
            throw new Error(`Unknown sentence ${ fromId }`)
        }

        if (this.sentenceById[toId]) {
            throw new Error(`Sentence ${ toId } already existed`)
        }
        
        this.changedIdByOldId[fromId] = toId        
        this.sentenceById[toId] = sentence
        sentence.id = toId
    }

    remove(sentence: Sentence) {
        this.updateChangedId(sentence)

        if (!this.sentenceById[sentence.id]) {
            throw new Error(`Unknown sentence ${ sentence.id }`)
        }
        
        delete this.sentenceById[sentence.id]
        
        this.sentences = this.sentences.filter((storedSentence) =>
            storedSentence.getId() != sentence.getId())
    }

    add(sentence: Sentence) {
        if (this.sentenceById[sentence.getId()]) {
            throw new Error(`Duplicate sentence ${ sentence.getId() }`)
        }

        if (sentence.getId() == undefined) {
            sentence.id = this.nextSentenceId++
        }

        this.sentences.push(sentence)
        this.sentenceById[sentence.getId()] = sentence
        
        if (sentence.getId() > this.nextSentenceId) {
            this.nextSentenceId = sentence.getId() + 1
        }
        
        if (this.onAdd) {
            this.onAdd(sentence)
        }
        
        return this
    }

    updateChangedId(sentence: Sentence) {
        let changedId = this.changedIdByOldId[sentence.id]
        
        if (changedId) {
            sentence.id = changedId
        }
    }
    
    store(sentence: Sentence) {
        this.updateChangedId(sentence)

        if (!this.sentenceById[sentence.getId()]) {
            throw new Error('Unknown sentence')
        }

        this.sentenceById[sentence.getId()] = sentence

        this.sentences.find((storedSentence, index) => {
            if (storedSentence.getId() == sentence.getId()) {
                this.sentences[index] = sentence

                return true
            }
        })
        
        if (this.onChange) {
            this.onChange(sentence)
        }
    }

    static fromJson(json, facts: Facts, words: Words) {
        let sentences = new Sentences()

        json.forEach((sentenceJson) => {
            sentences.add(Sentence.fromJson(sentenceJson, facts, words))
        })

        return sentences
    }
    
    toJson() {
        return this.sentences.map((sentence) => sentence.toJson())
    }
}